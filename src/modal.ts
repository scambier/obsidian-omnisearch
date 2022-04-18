import { Modal, TFile } from 'obsidian'
import type OmnisearchPlugin from './main'
import CmpModalVault from './CmpModalVault.svelte'
import CmpModalInFile from './CmpModalInFile.svelte'
import { inFileSearch, modal } from './stores'

export class OmnisearchModal extends Modal {
  constructor(plugin: OmnisearchPlugin, file?: TFile, canGoBack = false) {
    super(plugin.app)

    // Remove all the default modal's children (except the close button)
    // so that we can more easily customize it
    const closeEl = this.containerEl.find('.modal-close-button')
    this.modalEl.replaceChildren()
    this.modalEl.append(closeEl)
    this.modalEl.addClass('omnisearch-modal', 'prompt')

    inFileSearch.set(file ?? null)
    modal.set(this)

    if (file) {
      new CmpModalInFile({
        target: this.modalEl,
        props: {
          canGoBack,
        },
      })
    }
    else {
      new CmpModalVault({
        target: this.modalEl,
      })
    }
  }
}
