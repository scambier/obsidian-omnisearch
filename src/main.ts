import { Notice, Plugin, TFile } from 'obsidian'
import {SearchEngine} from './search/search-engine'
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

export default class OmnisearchPlugin extends Plugin {
  private ribbonButton?: HTMLElement

  async onload(): Promise<void> {
    await cleanOldCacheFiles()
    await loadSettings(this)

    // Initialize minisearch
    await SearchEngine.initFromCache()

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
    console.log('Omnisearch - Interrupting PDF indexing')
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
  const tmpEngine = SearchEngine.getTmpEngine()

  // Load plain text files
  console.time('Omnisearch - Timing')
  const files = await FileLoader.getPlainTextFiles()
  // Index them
  await tmpEngine.addAllToMinisearch(files)
  console.log(`Omnisearch - Indexed ${files.length} notes`)
  console.timeEnd('Omnisearch - Timing')

  // Load normal notes into the main search engine
  SearchEngine.loadTmpDataIntoMain()

  // Load PDFs
  if (settings.PDFIndexing) {
    console.time('Omnisearch - Timing')
    const pdfs = await FileLoader.getPDFFiles()
    // Index them
    await tmpEngine.addAllToMinisearch(pdfs)
    console.log(`Omnisearch - Indexed ${pdfs.length} PDFs`)
    console.timeEnd('Omnisearch - Timing')
  }

  // Load PDFs into the main search engine, and write cache
  SearchEngine.loadTmpDataIntoMain()
  await tmpEngine.writeToCache()

  // Clear memory
  SearchEngine.clearTmp()
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
