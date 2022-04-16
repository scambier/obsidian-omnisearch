import { Plugin, TFile } from 'obsidian'
import { OmnisearchModal } from './modal'
import { plugin } from './stores'
import {
  addToIndex,
  instantiateMinisearch,
  removeFromIndex,
  removeFromIndexByPath,
} from './search'

export default class OmnisearchPlugin extends Plugin {
  async onload(): Promise<void> {
    plugin.set(this)

    await instantiateMinisearch()

    // Commands to display Omnisearch modal
    this.addCommand({
      id: 'show-modal',
      name: 'Open Omnisearch',
      // hotkeys: [{ modifiers: ['Mod'], key: 'o' }],
      callback: () => {
        new OmnisearchModal(this).open()
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
