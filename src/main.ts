import { Notice, Platform, Plugin, TFile } from 'obsidian'
import { SearchEngine } from './search/search-engine'
import {
  OmnisearchInFileModal,
  OmnisearchVaultModal,
} from './components/modals'
import { loadSettings, settings, SettingsTab, showExcerpt } from './settings'
import { eventBus, EventNames } from './globals'
import { registerAPI } from '@vanakat/plugin-api'
import api from './tools/api'
import { isFilePlaintext, wait } from './tools/utils'
import * as NotesIndex from './notes-index'
import * as FileLoader from './file-loader'
import { OmnisearchCache } from './database'
import { cacheManager } from './cache-manager'

export default class OmnisearchPlugin extends Plugin {
  private ribbonButton?: HTMLElement

  async onload(): Promise<void> {
    await cleanOldCacheFiles()
    await OmnisearchCache.clearOldDatabases()
    await loadSettings(this)

    _registerAPI(this)

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
        this.app.vault.on('create', file => {
          NotesIndex.addToIndexAndMemCache(file)
        })
      )
      this.registerEvent(
        this.app.vault.on('delete', file => {
          NotesIndex.removeFromIndex(file.path)
        })
      )
      this.registerEvent(
        this.app.vault.on('modify', async file => {
          NotesIndex.markNoteForReindex(file)
        })
      )
      this.registerEvent(
        this.app.vault.on('rename', async (file, oldPath) => {
          if (file instanceof TFile && isFilePlaintext(file.path)) {
            NotesIndex.removeFromIndex(oldPath)
            await NotesIndex.addToIndexAndMemCache(file)
          }
        })
      )

      await populateIndex()
    })

    showWelcomeNotice(this)
  }

  onunload(): void {
    NotesIndex.processQueue.clearQueue()
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

  // Initialize minisearch
  let engine = SearchEngine.getEngine()

  // No cache for iOS
  if (!Platform.isIosApp) {
    engine = await SearchEngine.initFromCache()
  }

  // Load plaintext files
  console.log('Omnisearch - Fetching notes')
  const plainTextFiles = await FileLoader.getPlainTextFiles()
  let allFiles = [...plainTextFiles]
  // iOS: since there's no cache, directly index the documents
  if (Platform.isIosApp) {
    await wait(1000)
    await engine.addAllToMinisearch(plainTextFiles)
  }

  // Load PDFs
  if (settings.PDFIndexing) {
    console.log('Omnisearch - Fetching PDFs')
    const pdfs = await FileLoader.getPDFFiles()
    // iOS: since there's no cache, just index the documents
    if (Platform.isIosApp) {
      await wait(1000)
      await engine.addAllToMinisearch(pdfs)
    }
    // Add PDFs to the files list
    allFiles = [...allFiles, ...pdfs]
  }

  console.log('Omnisearch - Total number of files: ' + allFiles.length)
  let needToUpdateCache = false

  // Other platforms: make a diff of what's to add/update/delete
  if (!Platform.isIosApp) {
    console.log('Omnisearch - Checking index cache diff...')
    // Check which documents need to be removed/added/updated
    const diffDocs = await cacheManager.getDiffDocuments(allFiles)
    needToUpdateCache = !!(
      diffDocs.toAdd.length ||
      diffDocs.toDelete.length ||
      diffDocs.toUpdate.length
    )

    // Add
    await engine.addAllToMinisearch(diffDocs.toAdd)
    console.log(`Omnisearch - ${diffDocs.toAdd.length} files to add`)
    diffDocs.toAdd.forEach(doc =>
      cacheManager.updateLiveDocument(doc.path, doc)
    )

    // Delete
    console.log(`Omnisearch - ${diffDocs.toDelete.length} files to remove`)
    diffDocs.toDelete.forEach(d => engine.removeFromMinisearch(d))
    diffDocs.toDelete.forEach(doc => cacheManager.deleteLiveDocument(doc.path))

    // Update (delete + add)
    console.log(`Omnisearch - ${diffDocs.toUpdate.length} files to update`)
    diffDocs.toUpdate
      .forEach(({ oldDoc, newDoc }) => {
        engine.removeFromMinisearch(oldDoc)
        cacheManager.updateLiveDocument(oldDoc.path, newDoc)
      })
    await engine.addAllToMinisearch(diffDocs.toUpdate.map(d => d.newDoc))
  }

  // Load PDFs into the main search engine, and write cache
  // SearchEngine.loadTmpDataIntoMain()
  SearchEngine.isIndexing.set(false)

  if (!Platform.isIosApp && needToUpdateCache) {
    console.log('Omnisearch - Writing cache...')
    await SearchEngine.getEngine().writeToCache(allFiles)
  }

  console.timeEnd('Omnisearch - Indexing total time')
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

function showWelcomeNotice(plugin: Plugin) {
  const code = '1.7.6'
  if (settings.welcomeMessage !== code) {
    const welcome = new DocumentFragment()
    welcome.createSpan({}, span => {
      span.innerHTML = `<strong>Omnisearch has been updated</strong>
New beta feature: PDF search 🔎📄
<small>Toggle "<i>BETA - Index PDFs</i>" in Omnisearch settings page.</small>`
    })
    new Notice(welcome, 30000)
  }
  settings.welcomeMessage = code

  plugin.saveData(settings)
}

function _registerAPI(plugin: OmnisearchPlugin): void {
  registerAPI('omnisearch', api, plugin as any)
  ;(app as any).plugins.plugins.omnisearch.api = api
  plugin.register(() => {
    delete (app as any).plugins.plugins.omnisearch.api
  })
}
