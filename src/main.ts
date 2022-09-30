import { Plugin, TFile } from 'obsidian'
import { initGlobalSearchIndex } from './search'
import { OmnisearchInFileModal, OmnisearchVaultModal } from './modals'
import { loadSettings, settings, SettingsTab, showContext } from './settings'
import { eventBus } from './globals'
import { registerAPI } from '@vanakat/plugin-api'
import api from './api'
import { loadSearchHistory } from './search-history'
import {isFileIndexable, showWelcomeNotice} from './utils'
import { addNoteToReindex, addToIndex, removeFromIndex } from './notes-index'

function _registerAPI(plugin: OmnisearchPlugin): void {
  registerAPI('omnisearch', api, plugin as any)
  ;(app as any).plugins.plugins.omnisearch.api = api
  plugin.register(() => {
    delete (app as any).plugins.plugins.omnisearch.api
  })
}

export default class OmnisearchPlugin extends Plugin {
  async onload(): Promise<void> {
    // additional files to index by Omnisearch

    await loadSettings(this)

    this.registerExtensions(settings.indexedFileTypes, 'markdown')
    await loadSearchHistory()

    _registerAPI(this)

    if (settings.ribbonIcon) {
      this.addRibbonButton()
    }

    this.addSettingTab(new SettingsTab(this))
    eventBus.disable('vault')
    eventBus.disable('infile')
    eventBus.on('global', 'toggle-context', () => {
      showContext.set(!settings.showContext)
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
          addToIndex(file)
        })
      )
      this.registerEvent(
        this.app.vault.on('delete', file => {
          removeFromIndex(file.path)
        })
      )
      this.registerEvent(
        this.app.vault.on('modify', async file => {
          addNoteToReindex(file)
        })
      )
      this.registerEvent(
        this.app.vault.on('rename', async (file, oldPath) => {
          if (file instanceof TFile && isFileIndexable(file.path)) {
            removeFromIndex(oldPath)
            await addToIndex(file)
          }
        })
      )

      await initGlobalSearchIndex()
    })

    showWelcomeNotice(this)
  }

  onunload(): void {}

  addRibbonButton(): void {
    this.addRibbonIcon('search', 'Omnisearch', _evt => {
      new OmnisearchVaultModal(app).open()
    })
  }
}
