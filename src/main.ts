import { Plugin, TFile } from 'obsidian'
import {
  addNoteToReindex,
  addToIndex,
  initGlobalSearchIndex,
  reindexNotes,
  removeFromIndex,
} from './search'
import { OmnisearchInFileModal, OmnisearchVaultModal } from './modals'
import { loadSettings, settings, SettingsTab } from './settings'

const mainWindow = require('electron').remote.getCurrentWindow()
const onBlur = (): void => {
  reindexNotes()
}

export default class OmnisearchPlugin extends Plugin {
  async onload(): Promise<void> {
    mainWindow.on('blur', onBlur)

    await loadSettings(this)
    this.addSettingTab(new SettingsTab(this))

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
        }),
      )
      this.registerEvent(
        this.app.vault.on('delete', file => {
          removeFromIndex(file.path)
        }),
      )
      this.registerEvent(
        this.app.vault.on('modify', async file => {
          if (settings.reindexInRealTime) {
            removeFromIndex(file.path)
            await addToIndex(file)
          }
          else {
            addNoteToReindex(file)
          }
        }),
      )
      this.registerEvent(
        this.app.vault.on('rename', async (file, oldPath) => {
          if (file instanceof TFile && file.path.endsWith('.md')) {
            removeFromIndex(oldPath)
            await addToIndex(file)
          }
        }),
      )

      await initGlobalSearchIndex()
    })
  }

  onunload(): void {
    mainWindow.off('blur', onBlur)
  }
}
