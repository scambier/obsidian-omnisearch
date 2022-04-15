import { MarkdownView, Modal, TFile } from 'obsidian'
import type { ResultNote } from './globals'
import type OmnisearchPlugin from './main'
import CmpNoteResult from './CmpNoteResult.svelte'
import CmpModal from './CmpModal.svelte'
import { escapeHTML, escapeRegex, getAllIndexes, highlighter } from './utils'
import { selectedNoteId } from './stores'

export class OmnisearchModal extends Modal {
  private plugin: OmnisearchPlugin
  private mutationObserver?: MutationObserver
  private cmp: CmpModal

  constructor(plugin: OmnisearchPlugin) {
    super(plugin.app)
    this.plugin = plugin
    this.modalEl.addClass('omnisearch-modal', 'prompt')
    this.modalEl.replaceChildren() // Remove all the default Modal's children

    this.cmp = new CmpModal({
      target: this.modalEl,
      props: {
        plugin,
      },
    })

    // this.modalEl.addClass('omnisearch-modal')

    // this.setPlaceholder('Type to search through your notes')

    // this.setInstructions([
    //   { command: '↑↓', purpose: 'to navigate' },
    //   { command: '↵', purpose: 'to open' },
    //   { command: 'ctrl ↵', purpose: 'to open in a new pane' },
    //   { command: 'shift ↵', purpose: 'to create' },
    //   { command: 'esc', purpose: 'to dismiss' },
    // ])
  }

  onOpen(): void {
    this.containerEl.style.border = '1px solid red'
    this.modalEl.style.border = '1px solid blue'
    this.contentEl.style.border = '1px solid green'
    // this.inputEl.focus()
    // this.inputEl.onkeydown = this.onKeydown.bind(this)
    // Reload last search, if any
    // if (this.plugin.lastSearch) {
    //   const event = new Event('input', {
    //     bubbles: true,
    //     cancelable: true,
    //   })
    //   // this.inputEl.value = this.plugin.lastSearch
    //   // this.inputEl.dispatchEvent(event)
    //   // this.inputEl.select()
    //   // this.inputEl.spellcheck = false
    // }

    // this.setupObserver(this.modalEl)
  }


  // async onKeydown(ev: KeyboardEvent): Promise<void> {
  //   if (ev.key === 'ArrowRight') {
  //     console.log('TODO: open in-note search')
  //     return
  //   }
  //   const noteId = get(selectedNoteId)
  //   if (ev.key !== 'Enter' || !noteId) return

  //   if (ev.ctrlKey || ev.metaKey) {
  //     // Open in a new pane
  //     await this.app.workspace.openLinkText(noteId, '', true)
  //   }
  //   else if (ev.shiftKey) {
  //     // Create a note
  //     try {
  //       const file = await this.app.vault.create(
  //         this.inputEl.value + '.md',
  //         '# ' + this.inputEl.value,
  //       )
  //       await this.app.workspace.openLinkText(file.path, '')
  //     }
  //     catch (e) {
  //       if (e instanceof Error && e.message === 'File already exists.') {
  //         // Open the existing file instead of creating it
  //         await this.app.workspace.openLinkText(this.inputEl.value, '')
  //       }
  //       else {
  //         console.error(e)
  //       }
  //     }
  //   }
  //   this.close()
  // }

  /**
   * Observes the modal element to keep track of which search result is currently selected
   * @param modalEl
   */
  setupObserver(modalEl: HTMLElement): void {
    this.mutationObserver = new MutationObserver(events => {
      const record = events.find(event =>
        (event.target as HTMLDivElement).classList.contains('is-selected'),
      )
      const id =
        (record?.target?.firstChild as HTMLElement)?.getAttribute(
          'data-note-id',
        ) ?? null
      if (id) {
        selectedNoteId.set(id)
      }
    })
    this.mutationObserver.observe(modalEl, {
      attributes: true,
      subtree: true,
    })
  }

  async onChooseSuggestion(item: ResultNote): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(item.path) as TFile
    // const fileCache = this.app.metadataCache.getFileCache(file)
    // console.log(fileCache)
    const content = (await this.app.vault.cachedRead(file)).toLowerCase()
    const offset = content.indexOf(
      item.matches[item.occurence].match.toLowerCase(),
    )
    await this.app.workspace.openLinkText(item.path, '')

    const view = this.app.workspace.getActiveViewOfType(MarkdownView)
    if (!view) {
      throw new Error('OmniSearch - No active MarkdownView')
    }
    const pos = view.editor.offsetToPos(offset)
    pos.ch = 0

    view.editor.setCursor(pos)
    view.editor.scrollIntoView({
      from: { line: pos.line - 10, ch: 0 },
      to: { line: pos.line + 10, ch: 0 },
    })
  }
}
