import { App, MarkdownView, Modal, TFile } from 'obsidian'
import type { Modifier } from 'obsidian'
import ModalVault from './ModalVault.svelte'
import ModalInFile from './ModalInFile.svelte'
import { Action, eventBus, EventNames, isInputComposition } from '../globals'
import { settings } from '../settings'
import { cacheManager } from 'src/cache-manager'

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
      eventBus.emit(Action.ArrowDown)
    })
    this.scope.register([], 'ArrowUp', e => {
      e.preventDefault()
      eventBus.emit(Action.ArrowUp)
    })

    // Ctrl+j/k
    for (const key of [
      { k: 'J', dir: 'down' },
      { k: 'K', dir: 'up' },
    ] as const) {
      for (const modifier of ['Ctrl', 'Mod'] as const) {
        this.scope.register([modifier], key.k, _e => {
          if (settings.vimLikeNavigationShortcut) {
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
          if (settings.vimLikeNavigationShortcut) {
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
      createInCurrentPaneKey = ['Mod', 'Shift']
      createInNewPaneKey = ['Shift']
    } else {
      openInCurrentPaneKey = []
      openInNewPaneKey = ['Mod']
      createInCurrentPaneKey = ['Shift']
      createInNewPaneKey = ['Mod', 'Shift']
    }

    // Open in new pane
    this.scope.register(openInNewPaneKey, 'Enter', e => {
      e.preventDefault()
      eventBus.emit(Action.OpenInNewPane)
    })

    // Insert link
    this.scope.register(['Alt'], 'Enter', e => {
      e.preventDefault()
      eventBus.emit(Action.InsertLink)
    })

    // Create a new note
    this.scope.register(createInCurrentPaneKey, 'Enter', e => {
      e.preventDefault()
      eventBus.emit(Action.CreateNote)
    })
    this.scope.register(createInNewPaneKey, 'Enter', e => {
      e.preventDefault()
      eventBus.emit(Action.CreateNote, { newLeaf: true })
    })

    // Open in current pane
    this.scope.register(openInCurrentPaneKey, 'Enter', e => {
      if (!isInputComposition()) {
        // Check if the user is still typing
        e.preventDefault()
        eventBus.emit(Action.Enter)
      }
    })

    // Open in background
    this.scope.register(['Alt'], 'O', e => {
      if (!isInputComposition()) {
        // Check if the user is still typing
        e.preventDefault()
        eventBus.emit(Action.OpenInBackground)
      }
    })

    this.scope.register([], 'Tab', e => {
      e.preventDefault()
      eventBus.emit(Action.Tab) // Switch context
    })

    // Search history
    this.scope.register(['Alt'], 'ArrowDown', e => {
      e.preventDefault()
      eventBus.emit(Action.NextSearchHistory)
    })
    this.scope.register(['Alt'], 'ArrowUp', e => {
      e.preventDefault()
      eventBus.emit(Action.PrevSearchHistory)
    })

    // Context
    this.scope.register(['Ctrl'], 'H', _e => {
      eventBus.emit(EventNames.ToggleExcerpts)
    })
  }
}

export class OmnisearchVaultModal extends OmnisearchModal {
  /**
   * Instanciate the Omnisearch vault modal
   * @param app
   * @param query The query to pre-fill the search field with
   */
  constructor(app: App, query?: string) {
    super(app)

    // Selected text in the editor
    const selectedText = app.workspace
      .getActiveViewOfType(MarkdownView)
      ?.editor.getSelection()

    cacheManager.getSearchHistory().then(history => {
      // Previously searched query (if enabled in settings)
      const previous = settings.showPreviousQueryResults ? history[0] : null

      // Instantiate and display the Svelte component
      const cmp = new ModalVault({
        target: this.modalEl,
        props: {
          app,
          modal: this,
          previousQuery: query || selectedText || previous || '',
        },
      })
      this.onClose = () => {
        // Since the component is manually created,
        // we also need to manually destroy it
        cmp.$destroy()
      }
    })
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
        app,
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
