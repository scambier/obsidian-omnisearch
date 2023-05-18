import { App, Modal, TFile } from 'obsidian'
import type { Modifier } from 'obsidian'
import ModalVault from './ModalVault.svelte'
import ModalInFile from './ModalInFile.svelte'
import { eventBus, EventNames, isInputComposition } from '../globals'
import { settings } from '../settings'

abstract class OmnisearchModal extends Modal {
  protected constructor(app: App) {
    super(app)

    // Remove all the default modal's children
    // so that we can more easily customize it
    // const closeEl = this.containerEl.find('.modal-close-button')
    this.modalEl.replaceChildren()
    // this.modalEl.append(closeEl)
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
      { k: 'J', dir: 'down' },
      { k: 'K', dir: 'up' },
    ] as const) {
      for (const modifier of ['Ctrl', 'Mod'] as const) {
        this.scope.register([modifier], key.k, _e => {
          if (this.app.vault.getConfig('vimMode')) {
            // e.preventDefault()
            eventBus.emit('arrow-' + key.dir)
          }
        })
      }
    }

    // Ctrl+n/p
    for (const key of [
      { k: 'N', dir: 'down' },
      { k: 'P', dir: 'up' },
    ] as const) {
      for (const modifier of ['Ctrl', 'Mod'] as const) {
        this.scope.register([modifier], key.k, _e => {
          if (this.app.vault.getConfig('vimMode')) {
            // e.preventDefault()
            eventBus.emit('arrow-' + key.dir)
          }
        })
      }
    }

    // #endregion Up/Down navigation

    let openInCurrentPaneKey: Modifier[]
    let openInNewPaneKey: Modifier[]
    let createInCurrentPaneKey: Modifier[]
    let createInNewPaneKey: Modifier[]
    if (settings.openInNewPane) {
      openInCurrentPaneKey = ['Mod']
      openInNewPaneKey = []
      createInCurrentPaneKey = ['Ctrl', 'Shift']
      createInNewPaneKey = ['Shift']
    } else {
      openInCurrentPaneKey = []
      openInNewPaneKey = ['Mod']
      createInCurrentPaneKey = ['Shift']
      createInNewPaneKey = ['Ctrl', 'Shift']
    }

    // Open in new pane
    this.scope.register(openInNewPaneKey, 'Enter', e => {
      e.preventDefault()
      eventBus.emit('open-in-new-pane')
    })

    // Insert link
    this.scope.register(['Alt'], 'Enter', e => {
      e.preventDefault()
      eventBus.emit('insert-link')
    })

    // Create a new note
    this.scope.register(createInCurrentPaneKey, 'Enter', e => {
      e.preventDefault()
      eventBus.emit('create-note')
    })
    this.scope.register(createInNewPaneKey, 'Enter', e => {
      e.preventDefault()
      eventBus.emit('create-note', { newLeaf: true })
    })

    // Open in current pane
    this.scope.register(openInCurrentPaneKey, 'Enter', e => {
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
    this.scope.register(['Ctrl'], 'H', _e => {
      eventBus.emit(EventNames.ToggleExcerpts)
    })
  }
}

export class OmnisearchVaultModal extends OmnisearchModal {
  constructor(app: App, query?: string) {
    super(app)
    const cmp = new ModalVault({
      target: this.modalEl,
      props: {
        modal: this,
        previousQuery: query,
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
        previousQuery: searchQuery,
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
