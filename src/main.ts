import { Notice, Platform, Plugin } from 'obsidian'
import {
  OmnisearchInFileModal,
  OmnisearchVaultModal,
} from './components/modals'
import { loadSettings, settings, SettingsTab, showExcerpt } from './settings'
import { eventBus, EventNames, indexingStep, IndexingStepType } from './globals'
import api from './tools/api'
import { isFileIndexable } from './tools/utils'
import { database, OmnisearchCache } from './database'
import * as NotesIndex from './notes-index'
import { searchEngine } from './search/omnisearch'
import { cacheManager } from './cache-manager'

export default class OmnisearchPlugin extends Plugin {
  private ribbonButton?: HTMLElement

  async onload(): Promise<void> {
    await loadSettings(this)
    await cleanOldCacheFiles()
    await OmnisearchCache.clearOldDatabases()

    registerAPI(this)

    if (settings.ribbonIcon) {
      this.addRibbonButton()
    }

    this.addSettingTab(new SettingsTab(this))
    eventBus.disable('vault')
    eventBus.disable('infile')
    eventBus.on('global', EventNames.ToggleExcerpts, () => {
      showExcerpt.set(!settings.showExcerpt)
    })

    // Commands to display Omnisearch modals
    this.addCommand({
      id: 'show-modal',
      name: 'Vault search',
      callback: () => {
        new OmnisearchVaultModal(app).open()
      },
    })

    this.addCommand({
      id: 'show-modal-infile',
      name: 'In-file search',
      editorCallback: (_editor, view) => {
        new OmnisearchInFileModal(app, view.file).open()
      },
    })

    app.workspace.onLayoutReady(async () => {
      // Listeners to keep the search index up-to-date
      this.registerEvent(
        this.app.vault.on('create', async file => {
          if (isFileIndexable(file.path)) {
            await cacheManager.addToLiveCache(file.path)
            searchEngine.addFromPaths([file.path])
          }
        })
      )
      this.registerEvent(
        this.app.vault.on('delete', file => {
          cacheManager.removeFromLiveCache(file.path)
          searchEngine.removeFromPaths([file.path])
        })
      )
      this.registerEvent(
        this.app.vault.on('modify', async file => {
          if (isFileIndexable(file.path)) {
            await cacheManager.addToLiveCache(file.path)
            NotesIndex.markNoteForReindex(file)
          }
        })
      )
      this.registerEvent(
        this.app.vault.on('rename', async (file, oldPath) => {
          if (isFileIndexable(file.path)) {
            cacheManager.removeFromLiveCache(oldPath)
            cacheManager.addToLiveCache(file.path)
            searchEngine.removeFromPaths([oldPath])
            await searchEngine.addFromPaths([file.path])
          }
        })
      )

      await populateIndex()
    })

    executeFirstLaunchTasks(this)
  }

  async onunload(): Promise<void> {
    // @ts-ignore
    delete globalThis['omnisearch']

    // Clear cache when disabling Omnisearch
    if (process.env.NODE_ENV === 'production') {
      await database.clearCache()
    }
  }

  addRibbonButton(): void {
    this.ribbonButton = this.addRibbonIcon('search', 'Omnisearch', _evt => {
      new OmnisearchVaultModal(app).open()
    })
  }

  removeRibbonButton(): void {
    if (this.ribbonButton) {
      this.ribbonButton.parentNode?.removeChild(this.ribbonButton)
    }
  }
}

/**
 * Read the files and feed them to Minisearch
 */
async function populateIndex(): Promise<void> {
  console.time('Omnisearch - Indexing total time')
  indexingStep.set(IndexingStepType.ReadingFiles)
  const files = app.vault.getFiles().filter(f => isFileIndexable(f.path))
  console.log(`Omnisearch - ${files.length} files total`)

  // Map documents in the background
  // Promise.all(files.map(f => cacheManager.addToLiveCache(f.path)))

  if (!Platform.isIosApp) {
    console.time('Omnisearch - Loading index from cache')
    indexingStep.set(IndexingStepType.LoadingCache)
    await searchEngine.loadCache()
    console.timeEnd('Omnisearch - Loading index from cache')
  }

  const diff = searchEngine.getDiff(
    files.map(f => ({ path: f.path, mtime: f.stat.mtime }))
  )

  if (diff.toAdd.length) {
    console.log(
      'Omnisearch - Total number of files to add/update: ' + diff.toAdd.length
    )
  }
  if (diff.toRemove.length) {
    console.log(
      'Omnisearch - Total number of files to remove: ' + diff.toRemove.length
    )
  }

  if (diff.toAdd.length >= 500) {
    new Notice(
      `Omnisearch - ${diff.toAdd.length} files need to be indexed. Obsidian may experience stutters and freezes during the process`,
      10_000
    )
  }

  indexingStep.set(IndexingStepType.IndexingFiles)
  searchEngine.removeFromPaths(diff.toRemove.map(o => o.path))
  await searchEngine.addFromPaths(diff.toAdd.map(o => o.path))

  if (diff.toRemove.length || diff.toAdd.length) {
    indexingStep.set(IndexingStepType.WritingCache)
    await searchEngine.writeToCache()
  }

  console.timeEnd('Omnisearch - Indexing total time')
  if (diff.toAdd.length >= 500) {
    new Notice(`Omnisearch - Your files have been indexed.`)
  }
  indexingStep.set(IndexingStepType.Done)
}

async function cleanOldCacheFiles() {
  const toDelete = [
    `${app.vault.configDir}/plugins/omnisearch/searchIndex.json`,
    `${app.vault.configDir}/plugins/omnisearch/notesCache.json`,
    `${app.vault.configDir}/plugins/omnisearch/notesCache.data`,
    `${app.vault.configDir}/plugins/omnisearch/searchIndex.data`,
    `${app.vault.configDir}/plugins/omnisearch/historyCache.json`,
    `${app.vault.configDir}/plugins/omnisearch/pdfCache.data`,
  ]
  for (const item of toDelete) {
    if (await app.vault.adapter.exists(item)) {
      try {
        await app.vault.adapter.remove(item)
      } catch (e) {}
    }
  }
}

function executeFirstLaunchTasks(plugin: Plugin) {
  const code = '1.8.0-beta.3'
  if (settings.welcomeMessage !== code) {
    const welcome = new DocumentFragment()
    welcome.createSpan({}, span => {
      span.innerHTML = `<strong>Omnisearch has been updated</strong>
You can now enable "Images Indexing" to use Optical Character Recognition on your scanned documents
🔎🖼`
    })
    new Notice(welcome, 30000)
  }
  settings.welcomeMessage = code

  plugin.saveData(settings)
}

function registerAPI(plugin: OmnisearchPlugin): void {
  // Url scheme for obsidian://omnisearch?query=foobar
  plugin.registerObsidianProtocolHandler('omnisearch', params => {
    new OmnisearchVaultModal(app, params.query).open()
  })

  // Public api
  // @ts-ignore
  globalThis['omnisearch'] = api
  // Deprecated
  ;(app as any).plugins.plugins.omnisearch.api = api
}
