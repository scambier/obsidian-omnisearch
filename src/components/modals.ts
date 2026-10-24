import { MarkdownView, Modal, TFile } from 'obsidian'
import ModalVault from './ModalVault.svelte'
import ModalInFile from './ModalInFile.svelte'
import { eventBus, isInputComposition } from '../globals'
import { getShortcutHotkeys, shortcuts } from '../shortcuts'
import type OmnisearchPlugin from '../main'
import { mount, unmount } from 'svelte'

abstract class OmnisearchModal extends Modal {
  protected constructor(plugin: OmnisearchPlugin, type: 'vault' | 'infile') {
    super(plugin.app)
    const settings = plugin.settings

    // Remove all the default modal's children
    // so that we can more easily customize it
    // const closeEl = this.containerEl.find('.modal-close-button')
    this.modalEl.replaceChildren()
    // this.modalEl.append(closeEl)
    this.modalEl.addClass('omnisearch-modal', 'prompt')
    this.modalEl.removeClass('modal')
    this.modalEl.tabIndex = -1

    for (const shortcut of shortcuts) {
      if (shortcut.appliesTo !== 'both' && shortcut.appliesTo !== type) continue
      if (shortcut.vimOnly && !settings.vimLikeNavigationShortcut) continue
      const hotkeys = getShortcutHotkeys(settings.shortcuts, shortcut)
      for (const hotkey of hotkeys) {
        this.scope.register(hotkey.modifiers, hotkey.key, e => {
          if (shortcut.checkComposition && isInputComposition()) return
          e.preventDefault()
          eventBus.emit(shortcut.event, shortcut.data)
        })
      }
    }
  }
}

export class OmnisearchVaultModal extends OmnisearchModal {
  /**
   * Instanciate the Omnisearch vault modal
   * @param plugin
   * @param query The query to pre-fill the search field with
   */
  constructor(plugin: OmnisearchPlugin, query?: string) {
    super(plugin, 'vault')

    // Selected text in the editor
    const selectedText = plugin.app.workspace
      .getActiveViewOfType(MarkdownView)
      ?.editor.getSelection()

    plugin.searchHistory.getHistory().then(history => {
      // Previously searched query (if enabled in settings)
      const previous = plugin.settings.showPreviousQueryResults
        ? history[0]
        : null

      // Instantiate and display the Svelte component
      const cmp = mount(ModalVault, {
        target: this.modalEl,
        props: {
          plugin,
          modal: this,
          previousQuery: query || selectedText || previous || '',
        },
      })

      this.onClose = () => {
        // Since the component is manually created,
        // we also need to manually destroy it
        void unmount(cmp)
      }
    }).catch(e => {
      console.error('Omnisearch - Failed to load search history', e)
    })
  }
}

export class OmnisearchInFileModal extends OmnisearchModal {
  constructor(
    plugin: OmnisearchPlugin,
    file: TFile,
    searchQuery: string = '',
    parent?: OmnisearchModal
  ) {
    super(plugin, 'infile')

    const cmp = mount(ModalInFile, {
      target: this.modalEl,
      props: {
        plugin,
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
      void unmount(cmp)
    }
  }
}
