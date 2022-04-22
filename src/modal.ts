import { App, Modal, TFile } from 'obsidian'
import CmpModalVault from './CmpModalVault.svelte'
import CmpModalInFile from './CmpModalInFile.svelte'
import { eventBus } from './globals'

abstract class ModalOmnisearch extends Modal {
  constructor(app: App) {
    super(app)

    // Remove all the default modal's children (except the close button)
    // so that we can more easily customize it
    const closeEl = this.containerEl.find('.modal-close-button')
    this.modalEl.replaceChildren()
    this.modalEl.append(closeEl)
    this.modalEl.addClass('omnisearch-modal', 'prompt')

    this.modalEl.tabIndex = -1
    this.modalEl.onkeydown = ev => {
      switch (ev.key) {
        case 'ArrowDown':
          ev.preventDefault()
          eventBus.emit('arrow-down')
          break
        case 'ArrowUp':
          ev.preventDefault()
          eventBus.emit('arrow-up')
          break
        case 'Enter':
          ev.preventDefault()
          if (ev.ctrlKey || ev.metaKey) {
            // Open in a new pane
            eventBus.emit('ctrl-enter')
          }
          else if (ev.shiftKey) {
            // Create a new note
            eventBus.emit('shift-enter')
          }
          else if (ev.altKey) {
            // Expand in-note results
            eventBus.emit('alt-enter')
          }
          else {
            // Open in current pane
            eventBus.emit('enter')
          }
          break
      }
    }
  }
}

export class ModalVault extends ModalOmnisearch {
  constructor(app: App) {
    super(app)
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
    app: App,
    file: TFile,
    searchQuery: string = '',
    parent?: ModalOmnisearch,
  ) {
    super(app)

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
