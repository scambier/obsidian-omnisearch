import { MarkdownView, Plugin, TFile } from 'obsidian'
import { OmnisearchModal } from './modal'
import { plugin } from './stores'
import {
  addToIndex,
  initGlobalSearchIndex,
  removeFromIndex,
  removeFromIndexByPath,
} from './search'

export default class OmnisearchPlugin extends Plugin {
  async onload(): Promise<void> {
    plugin.set(this)

    await initGlobalSearchIndex()

    // Commands to display Omnisearch modal
    this.addCommand({
      id: 'show-modal',
      name: 'Vault search',
      // hotkeys: [{ modifiers: ['Mod'], key: 'o' }],
      callback: () => {
        new OmnisearchModal(this).open()
      },
    })

    this.addCommand({
      id: 'show-modal-infile',
      name: 'In-file search',
      // hotkeys: [{ modifiers: ['Mod'], key: 'o' }],
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (view) {
          if (!checking) {
            new OmnisearchModal(this, view.file).open()
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
  }
}
