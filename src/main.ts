import { App, Notice, Platform, Plugin } from 'obsidian'
import {
  OmnisearchInFileModal,
  OmnisearchVaultModal,
} from './components/modals'
import {
  isPluginDisabled,
  loadSettings,
  saveSettings,
  settings,
  SettingsTab,
  showExcerpt,
} from './settings'
import {
  eventBus,
  EventNames,
  getTextExtractor,
  indexingStep,
  IndexingStepType,
  isCacheEnabled,
} from './globals'
import api, { notifyOnIndexed } from './tools/api'
import { isFileIndexable, logDebug } from './tools/utils'
import { database, OmnisearchCache } from './database'
import * as NotesIndex from './notes-index'
import { searchEngine } from './search/omnisearch'
import { cacheManager } from './cache-manager'

export default class OmnisearchPlugin extends Plugin {
  private ribbonButton?: HTMLElement

  // FIXME: fix the type
  public apiHttpServer: null | any = null

  async onload(): Promise<void> {
    await loadSettings(this)
    this.addSettingTab(new SettingsTab(this))

    if (!Platform.isMobile) {
      import('./tools/api-server').then(
        m => (this.apiHttpServer = m.getServer())
      )
    }

    if (isPluginDisabled()) {
      console.log('Omnisearch - Plugin disabled')
      return
    }

    await cleanOldCacheFiles(this.app)
    await OmnisearchCache.clearOldDatabases()

    registerAPI(this)

    if (settings.ribbonIcon) {
      this.addRibbonButton()
    }

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
        new OmnisearchVaultModal(this.app).open()
      },
    })

    this.addCommand({
      id: 'show-modal-infile',
      name: 'In-file search',
      editorCallback: (_editor, view) => {
        if (view.file) {
          new OmnisearchInFileModal(this.app, view.file).open()
        }
      },
    })

    this.app.workspace.onLayoutReady(async () => {
      // Listeners to keep the search index up-to-date
      this.registerEvent(
        this.app.vault.on('create', file => {
          if (isFileIndexable(file.path)) {
            logDebug('Indexing new file', file.path)
            // await cacheManager.addToLiveCache(file.path)
            searchEngine.addFromPaths([file.path])
          }
        })
      )
      this.registerEvent(
        this.app.vault.on('delete', file => {
          logDebug('Removing file', file.path)
          cacheManager.removeFromLiveCache(file.path)
          searchEngine.removeFromPaths([file.path])
        })
      )
      this.registerEvent(
        this.app.vault.on('modify', async file => {
          if (isFileIndexable(file.path)) {
            logDebug('Updating file', file.path)
            await cacheManager.addToLiveCache(file.path)
            NotesIndex.markNoteForReindex(file)
          }
        })
      )
      this.registerEvent(
        this.app.vault.on('rename', async (file, oldPath) => {
          if (isFileIndexable(file.path)) {
            logDebug('Renaming file', file.path)
            cacheManager.removeFromLiveCache(oldPath)
            await cacheManager.addToLiveCache(file.path)
            searchEngine.removeFromPaths([oldPath])
            await searchEngine.addFromPaths([file.path])
          }
        })
      )

      await this.executeFirstLaunchTasks()
      await this.populateIndex()

      if (this.apiHttpServer && settings.httpApiEnabled) {
        this.apiHttpServer.listen(settings.httpApiPort)
      }
    })
  }

  async executeFirstLaunchTasks(): Promise<void> {
    const code = '1.21.0'
    // if (settings.welcomeMessage !== code && getTextExtractor()) {
    //   const welcome = new DocumentFragment()
    //   welcome.createSpan({}, span => {
    //     span.innerHTML = `🔎 Omnisearch can now index .docx and .xlsx documents. Don't forget to update Text Extractor and enable the toggle in Omnisearch settings.`
    //   })
    //   new Notice(welcome, 20_000)
    // }
    settings.welcomeMessage = code
    await this.saveData(settings)
  }

  async onunload(): Promise<void> {
    // @ts-ignore
    delete globalThis['omnisearch']

    // Clear cache when disabling Omnisearch
    if (process.env.NODE_ENV === 'production') {
      await database.clearCache()
    }
    this.apiHttpServer.close()
  }

  addRibbonButton(): void {
    this.ribbonButton = this.addRibbonIcon('search', 'Omnisearch', _evt => {
      new OmnisearchVaultModal(this.app).open()
    })
  }

  removeRibbonButton(): void {
    if (this.ribbonButton) {
      this.ribbonButton.parentNode?.removeChild(this.ribbonButton)
    }
  }

  private async populateIndex(): Promise<void> {
    console.time('Omnisearch - Indexing total time')
    indexingStep.set(IndexingStepType.ReadingFiles)
    const files = this.app.vault.getFiles().filter(f => isFileIndexable(f.path))
    console.log(`Omnisearch - ${files.length} files total`)
    console.log(
      `Omnisearch - Cache is ${isCacheEnabled() ? 'enabled' : 'disabled'}`
    )
    // Map documents in the background
    // Promise.all(files.map(f => cacheManager.addToLiveCache(f.path)))

    if (isCacheEnabled()) {
      console.time('Omnisearch - Loading index from cache')
      indexingStep.set(IndexingStepType.LoadingCache)
      const hasCache = await searchEngine.loadCache()
      if (hasCache) {
        console.timeEnd('Omnisearch - Loading index from cache')
      }
    }

    const diff = searchEngine.getDiff(
      files.map(f => ({ path: f.path, mtime: f.stat.mtime }))
    )

    if (isCacheEnabled()) {
      if (diff.toAdd.length) {
        console.log(
          'Omnisearch - Total number of files to add/update: ' +
            diff.toAdd.length
        )
      }
      if (diff.toRemove.length) {
        console.log(
          'Omnisearch - Total number of files to remove: ' +
            diff.toRemove.length
        )
      }
    }

    if (diff.toAdd.length >= 1000 && isCacheEnabled()) {
      new Notice(
        `Omnisearch - ${diff.toAdd.length} files need to be indexed. Obsidian may experience stutters and freezes during the process`,
        10_000
      )
    }

    indexingStep.set(IndexingStepType.IndexingFiles)
    searchEngine.removeFromPaths(diff.toRemove.map(o => o.path))
    await searchEngine.addFromPaths(diff.toAdd.map(o => o.path))

    if ((diff.toRemove.length || diff.toAdd.length) && isCacheEnabled()) {
      indexingStep.set(IndexingStepType.WritingCache)

      // Disable settings.useCache while writing the cache, in case it freezes
      settings.useCache = false
      await saveSettings(this)

      // Write the cache
      await searchEngine.writeToCache()

      // Re-enable settings.caching
      settings.useCache = true
      await saveSettings(this)
    }

    console.timeEnd('Omnisearch - Indexing total time')
    if (diff.toAdd.length >= 1000 && isCacheEnabled()) {
      new Notice(`Omnisearch - Your files have been indexed.`)
    }
    indexingStep.set(IndexingStepType.Done)
    notifyOnIndexed()
  }
}

/**
 * Read the files and feed them to Minisearch
 */

async function cleanOldCacheFiles(app: App) {
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

function registerAPI(plugin: OmnisearchPlugin): void {
  // Url scheme for obsidian://omnisearch?query=foobar
  plugin.registerObsidianProtocolHandler('omnisearch', params => {
    new OmnisearchVaultModal(plugin.app, params.query).open()
  })

  // Public api
  // @ts-ignore
  globalThis['omnisearch'] = api
  // Deprecated
  ;(plugin.app as any).plugins.plugins.omnisearch.api = api
}
