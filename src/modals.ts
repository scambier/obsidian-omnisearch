import { App, Modal, TFile, Platform } from 'obsidian'
import ModalVault from './components/ModalVault.svelte'
import ModalInFile from './components/ModalInFile.svelte'
import { eventBus, isInputComposition } from './globals'
import { settings } from './settings'
import { get } from 'svelte/store'

abstract class OmnisearchModal extends Modal {
  constructor(app: App) {
    super(app)

    // Remove all the default modal's children (except the close button)
    // so that we can more easily customize it
    const closeEl = this.containerEl.find('.modal-close-button')
    this.modalEl.replaceChildren()
    this.modalEl.append(closeEl)
    this.modalEl.addClass('omnisearch-modal', 'prompt')
    this.modalEl.removeClass('modal')
    this.modalEl.tabIndex = -1

    // Setup events that can be listened through the event bus

    // #region Up/Down navigation

    this.scope.register([], 'ArrowDown', e => {
      e.preventDefault()
      eventBus.emit('arrow-down')
    })
    this.scope.register([], 'ArrowUp', e => {
      e.preventDefault()
      eventBus.emit('arrow-up')
    })

    // Ctrl+j/k
    for (const key of [
      { k: 'j', dir: 'down' },
      { k: 'k', dir: 'up' },
    ] as const) {
      for (const modifier of ['Ctrl', 'Meta'] as const) {
        this.scope.register([modifier], key.k, e => {
          if (get(settings).CtrlJK && this.app.vault.getConfig('vimMode')) {
            e.preventDefault()
            eventBus.emit('arrow-' + key.dir)
          }
        })
      }
    }

    // Ctrl+n/p
    for (const key of [
      { k: 'n', dir: 'down' },
      { k: 'p', dir: 'up' },
    ] as const) {
      for (const modifier of ['Ctrl', 'Meta'] as const) {
        this.scope.register([modifier], key.k, e => {
          if (get(settings).CtrlNP && this.app.vault.getConfig('vimMode')) {
            e.preventDefault()
            eventBus.emit('arrow-' + key.dir)
          }
        })
      }
    }

    // #endregion Up/Down navigation

    // Open in new pane
    this.scope.register(['Mod'], 'Enter', e => {
      e.preventDefault()
      eventBus.emit('open-in-new-pane')
    })

    // Insert link
    this.scope.register(['Alt'], 'Enter', e => {
      e.preventDefault()
      eventBus.emit('insert-link')
    })

    // Create a new note
    this.scope.register(['Shift'], 'Enter', e => {
      e.preventDefault()
      eventBus.emit('create-note')
    })
    this.scope.register(['Ctrl', 'Shift'], 'Enter', e => {
      e.preventDefault()
      eventBus.emit('create-note', { newLeaf: true })
    })

    // Open in current pane
    this.scope.register([], 'Enter', e => {
      if (!isInputComposition()) {
        // Check if the user is still typing
        e.preventDefault()
        eventBus.emit('enter')
      }
    })

    this.scope.register([], 'Tab', e => {
      e.preventDefault()
      eventBus.emit('tab') // Switch context
    })

    // Search history
    this.scope.register(['Alt'], 'ArrowDown', e => {
      e.preventDefault()
      eventBus.emit('next-search-history')
    })
    this.scope.register(['Alt'], 'ArrowUp', e => {
      e.preventDefault()
      eventBus.emit('prev-search-history')
    })

    // Context
    this.scope.register(['Ctrl'], 'h', e => {
      e.preventDefault()
      eventBus.emit('toggle-context')
    })
  }
}

export class OmnisearchVaultModal extends OmnisearchModal {
  constructor(app: App) {
    super(app)
    const cmp = new ModalVault({
      target: this.modalEl,
      props: {
        modal: this,
      },
    })

    this.onClose = () => {
      // Since the component is manually created,
      // we also need to manually destroy it
      cmp.$destroy()
    }
  }
}

export class OmnisearchInFileModal extends OmnisearchModal {
  constructor(
    app: App,
    file: TFile,
    searchQuery: string = '',
    parent?: OmnisearchModal
  ) {
    super(app)

    const cmp = new ModalInFile({
      target: this.modalEl,
      props: {
        modal: this,
        singleFilePath: file.path,
        parent: parent,
        searchQuery,
      },
    })

    if (parent) {
      // Hide the parent vault modal, and show it back when this one is closed
      parent.containerEl.toggleVisibility(false)
    }
    this.onClose = () => {
      if (parent) {
        parent.containerEl.toggleVisibility(true)
      }
      cmp.$destroy()
    }
  }
}
