import { Notice, Platform, Plugin, TFile } from 'obsidian'
import {
  OmnisearchInFileModal,
  OmnisearchVaultModal,
} from './components/modals'
import { loadSettings, settings, SettingsTab, showExcerpt } from './settings'
import { eventBus, EventNames, indexingStep, IndexingStepType } from './globals'
import api from './tools/api'
import { isFileImage, isFilePDF, isFilePlaintext } from './tools/utils'
import { OmnisearchCache } from './database'
import * as NotesIndex from './notes-index'
import { searchEngine } from './search/omnisearch'

export default class OmnisearchPlugin extends Plugin {
  private ribbonButton?: HTMLElement

  async onload(): Promise<void> {
    await cleanOldCacheFiles()
    await OmnisearchCache.clearOldDatabases()
    await loadSettings(this)

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
        this.app.vault.on('create', file => {
          searchEngine.addFromPaths([file.path])
        })
      )
      this.registerEvent(
        this.app.vault.on('delete', file => {
          searchEngine.removeFromPaths([file.path])
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
            searchEngine.removeFromPaths([oldPath])
            await searchEngine.addFromPaths([file.path])
          }
        })
      )

      await populateIndex()
    })

    showWelcomeNotice(this)
  }

  onunload(): void {
    // @ts-ignore
    delete globalThis['omnisearch']
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

  // // if not iOS, load data from cache
  // if (!Platform.isIosApp) {
  //   engine = await SearchEngine.initFromCache()
  // }

  // Load plaintext files
  indexingStep.set(IndexingStepType.ReadingNotes)
  console.log('Omnisearch - Reading notes')
  const plainTextFiles = app.vault
    .getFiles()
    .filter(f => isFilePlaintext(f.path))
    .map(p => p.path)
  await searchEngine.addFromPaths(plainTextFiles)

  let allFiles: string[] = [...plainTextFiles]

  // Load PDFs
  if (settings.PDFIndexing) {
    indexingStep.set(IndexingStepType.ReadingPDFs)
    console.log('Omnisearch - Reading PDFs')
    const pdfDocuments = app.vault
      .getFiles()
      .filter(f => isFilePDF(f.path))
      .map(p => p.path)
    await searchEngine.addFromPaths(pdfDocuments)
    // Add PDFs to the files list
    allFiles = [...allFiles, ...pdfDocuments]
  }

  // Load Images
  if (settings.imagesIndexing) {
    indexingStep.set(IndexingStepType.ReadingImages)
    console.log('Omnisearch - Reading Images')
    const imagesDocuments = app.vault
      .getFiles()
      .filter(f => isFileImage(f.path))
      .map(p => p.path)
    await searchEngine.addFromPaths(imagesDocuments)
    // Add Images to the files list
    allFiles = [...allFiles, ...imagesDocuments]
  }

  console.log('Omnisearch - Total number of files: ' + allFiles.length)

  // Load PDFs into the main search engine, and write cache
  // SearchEngine.loadTmpDataIntoMain()
  indexingStep.set(IndexingStepType.Done)

  if (!Platform.isIosApp) {
    console.log('Omnisearch - Writing cache...')
    await searchEngine.writeToCache()
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
