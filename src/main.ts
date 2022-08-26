import { Plugin, TFile } from 'obsidian'
import {
  addNoteToReindex,
  addToIndex,
  initGlobalSearchIndex,
  removeFromIndex,
} from './search'
import { OmnisearchInFileModal, OmnisearchVaultModal } from './modals'
import { loadSettings, settings, SettingsTab } from './settings'
import { eventBus } from './globals'
import { registerAPI } from '@vanakat/plugin-api'
import api from './api'

// let mainWindow: { on: any; off: any } | null = null
// try {
//   mainWindow = require('electron').remote.getCurrentWindow()
// }
// catch (e) {
//   console.log("Can't load electron, mobile platform")
// }

function _registerAPI(plugin: OmnisearchPlugin): void {
  registerAPI('omnisearch', api, plugin as any)
  ;(app as any).plugins.plugins.omnisearch.api = api
  plugin.register(() => {
    delete (app as any).plugins.plugins.omnisearch.api
  })
}

export default class OmnisearchPlugin extends Plugin {
  async onload(): Promise<void> {
    await loadSettings(this)

    _registerAPI(this)

    if (settings.ribbonIcon) {
      this.addRibbonButton()
    }

    this.addSettingTab(new SettingsTab(this))
    eventBus.disable('vault')
    eventBus.disable('infile')

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
          if (file instanceof TFile && file.path.endsWith('.md')) {
            removeFromIndex(oldPath)
            await addToIndex(file)
          }
        })
      )

      await initGlobalSearchIndex()
    })
  }

  onunload(): void {}

  addRibbonButton(): void {
    this.addRibbonIcon('search', 'Omnisearch', evt => {
      new OmnisearchVaultModal(app).open()
    })
  }
}
