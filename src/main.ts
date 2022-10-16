import { Notice, Plugin, TFile } from 'obsidian'
import * as Search from './search'
import { OmnisearchInFileModal, OmnisearchVaultModal } from './modals'
import { loadSettings, settings, SettingsTab, showExcerpt } from './settings'
import { eventBus, EventNames } from './globals'
import { registerAPI } from '@vanakat/plugin-api'
import api from './api'
import { loadSearchHistory } from './search-history'
import { isFilePlaintext } from './utils'
import * as NotesIndex from './notes-index'
import { cacheManager } from './cache-manager'

function _registerAPI(plugin: OmnisearchPlugin): void {
  registerAPI('omnisearch', api, plugin as any)
  ;(app as any).plugins.plugins.omnisearch.api = api
  plugin.register(() => {
    delete (app as any).plugins.plugins.omnisearch.api
  })
}

export default class OmnisearchPlugin extends Plugin {
  async onload(): Promise<void> {
    await cleanOldCacheFiles()
    await loadSettings(this)
    await loadSearchHistory()
    await cacheManager.loadNotesCache()

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
          NotesIndex.addToIndexAndCache(file)
        })
      )
      this.registerEvent(
        this.app.vault.on('delete', file => {
          NotesIndex.removeFromIndex(file.path)
        })
      )
      this.registerEvent(
        this.app.vault.on('modify', async file => {
          NotesIndex.addNoteToReindex(file)
        })
      )
      this.registerEvent(
        this.app.vault.on('rename', async (file, oldPath) => {
          if (file instanceof TFile && isFilePlaintext(file.path)) {
            NotesIndex.removeFromIndex(oldPath)
            await NotesIndex.addToIndexAndCache(file)
          }
        })
      )

      await Search.initGlobalSearchIndex()
    })

    // showWelcomeNotice(this)
  }

  onunload(): void {
    console.log('Omnisearch - Interrupting PDF indexing')
    NotesIndex.pdfQueue.clearQueue()
  }

  addRibbonButton(): void {
    this.addRibbonIcon('search', 'Omnisearch', _evt => {
      new OmnisearchVaultModal(app).open()
    })
  }
}

async function cleanOldCacheFiles() {
  const toDelete = [
    `${app.vault.configDir}/plugins/omnisearch/searchIndex.json`,
    `${app.vault.configDir}/plugins/omnisearch/notesCache.json`,
    `${app.vault.configDir}/plugins/omnisearch/pdfCache.data`
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
  return
  const code = '1.6.0'
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
