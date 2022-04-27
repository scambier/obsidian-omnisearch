import { Notice, Plugin, TFile } from 'obsidian'
import {
  addToIndex,
  initGlobalSearchIndex,
  removeFromIndex,
  removeFromIndexByPath,
} from './search'
import { OmnisearchInFileModal, OmnisearchVaultModal } from './modals'

export default class OmnisearchPlugin extends Plugin {
  async onload(): Promise<void> {
    warningOldVersion()

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

      await initGlobalSearchIndex()
    })
  }
}

function warningOldVersion(): void {
  const plugins = ((app as any).plugins?.plugins ?? {}) as Record<string, any>
  if (plugins['scambier.omnisearch']) {
    new Notice(
      `OMNISEARCH
It looks like you have 2 versions of Omnisearch installed.
Please uninstall the old one (up to 0.2.5) and keep the new one (1.0.0+)
(Click to dismiss)`,
      0,
    )
  }
}
