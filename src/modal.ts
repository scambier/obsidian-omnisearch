import { Modal } from 'obsidian'
import type OmnisearchPlugin from './main'
import CmpModal from './CmpModal.svelte'
import { modal } from './stores'

export class OmnisearchModal extends Modal {
  constructor(plugin: OmnisearchPlugin) {
    super(plugin.app)
    this.modalEl.addClass('omnisearch-modal', 'prompt')
    this.modalEl.replaceChildren() // Remove all the default Modal's children

    modal.set(this)

    new CmpModal({
      target: this.modalEl,
    })
  }
}
