import { Modal, TFile } from 'obsidian'
import type OmnisearchPlugin from './main'
import CmpModalVault from './CmpModalVault.svelte'
import CmpModalInFile from './CmpModalInFile.svelte'

abstract class ModalOmnisearch extends Modal {
  constructor(plugin: OmnisearchPlugin) {
    super(plugin.app)

    // Remove all the default modal's children (except the close button)
    // so that we can more easily customize it
    const closeEl = this.containerEl.find('.modal-close-button')
    this.modalEl.replaceChildren()
    this.modalEl.append(closeEl)
    this.modalEl.addClass('omnisearch-modal', 'prompt')
  }
}

export class ModalVault extends ModalOmnisearch {
  constructor(plugin: OmnisearchPlugin) {
    super(plugin)

    new CmpModalVault({
      target: this.modalEl,
      props: {
        modal: this,
      },
    })
  }
}

export class ModalInFile extends ModalOmnisearch {
  constructor(
    plugin: OmnisearchPlugin,
    file: TFile,
    searchQuery: string = '',
    parent?: ModalOmnisearch,
  ) {
    super(plugin)

    if (parent) {
      // Hide the parent modal
      parent.containerEl.toggleVisibility(false)
      this.onClose = () => {
        parent.containerEl.toggleVisibility(true)
      }
    }

    new CmpModalInFile({
      target: this.modalEl,
      props: {
        modal: this,
        singleFilePath: file.path,
        parent: parent,
        searchQuery,
      },
    })
  }
}
