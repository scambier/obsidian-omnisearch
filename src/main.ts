import { MarkdownView, Plugin, TFile } from 'obsidian'
import { plugin } from './stores'
import {
  addToIndex,
  initGlobalSearchIndex,
  removeFromIndex,
  removeFromIndexByPath,
} from './search'
import { ModalInFile, ModalVault } from './modal'

export default class OmnisearchPlugin extends Plugin {
  async onload(): Promise<void> {
    plugin.set(this)

    // Commands to display Omnisearch modals
    this.addCommand({
      id: 'show-modal',
      name: 'Vault search',
      callback: () => {
        new ModalVault(this).open()
      },
    })

    this.addCommand({
      id: 'show-modal-infile',
      name: 'In-file search',
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (view) {
          if (!checking) {
            new ModalInFile(this, view.file).open()
          }
          return true
        }
        return false
      },
    })

    // Listeners to keep the search index up-to-date
    this.registerEvent(
      this.app.vault.on('create', file => {
        addToIndex(file)
      }),
    )
    this.registerEvent(
      this.app.vault.on('delete', file => {
        removeFromIndex(file)
      }),
    )
    this.registerEvent(
      this.app.vault.on('modify', async file => {
        removeFromIndex(file)
        await addToIndex(file)
      }),
    )
    this.registerEvent(
      this.app.vault.on('rename', async (file, oldPath) => {
        if (file instanceof TFile && file.path.endsWith('.md')) {
          removeFromIndexByPath(oldPath)
          await addToIndex(file)
        }
      }),
    )

    initGlobalSearchIndex()
  }
}
