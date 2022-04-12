import { SuggestModal } from 'obsidian'
import { ResultNote } from './globals'
import OmnisearchPlugin from './main'
import { escapeRegex, highlighter } from './utils'

export class OmnisearchModal extends SuggestModal<ResultNote> {
  private plugin: OmnisearchPlugin
  private selectedNoteId?: string
  private mutationObserver?: MutationObserver

  constructor(plugin: OmnisearchPlugin) {
    super(plugin.app)
    this.plugin = plugin

    this.setPlaceholder('Type to search through your notes')

    this.setInstructions([
      { command: '↑↓', purpose: 'to navigate' },
      { command: '↵', purpose: 'to open' },
      { command: 'ctrl ↵', purpose: 'to open in a new pane' },
      { command: 'shift ↵', purpose: 'to create' },
      { command: 'esc', purpose: 'to dismiss' },
    ])
  }

  async onKeydown(ev: KeyboardEvent): Promise<void> {
    const noteId = this.selectedNoteId
    if (ev.key !== 'Enter' || !noteId) return

    if (ev.ctrlKey) {
      // Open in a new pane
      await this.app.workspace.openLinkText(noteId, '', true)
    }
    else if (ev.shiftKey) {
      // Create a note
      try {
        const file = await this.app.vault.create(
          this.inputEl.value + '.md',
          '# ' + this.inputEl.value,
        )
        await this.app.workspace.openLinkText(file.path, '')
      }
      catch (e) {
        if (e.message === 'File already exists.') {
          await this.app.workspace.openLinkText(this.inputEl.value, '')
        }
      }
    }
    this.close()
  }

  /**
   * Observes the modal element to keep track of which search result is currently selected
   * @param modalEl
   */
  setupObserver(modalEl: HTMLElement): void {
    this.mutationObserver = new MutationObserver(events => {
      const record = events.find(event =>
        (event.target as HTMLDivElement).classList.contains('is-selected'),
      )
      const id = (record?.target as HTMLElement).getAttribute('data-note-id')
      if (id) {
        this.selectedNoteId = id
      }
    })
    this.mutationObserver.observe(modalEl, {
      attributes: true,
      subtree: true,
    })
  }

  onOpen(): void {
    this.inputEl.focus()
    this.setupObserver(this.modalEl)

    // Reload last search, if any
    if (this.plugin.lastSearch) {
      const event = new Event('input', {
        bubbles: true,
        cancelable: true,
      })
      this.inputEl.value = this.plugin.lastSearch
      this.inputEl.dispatchEvent(event)
      this.inputEl.select()
    }

    this.inputEl.onkeydown = this.onKeydown.bind(this)
  }

  onClose(): void {
    this.mutationObserver.disconnect()
  }

  async getSuggestions(query: string): Promise<ResultNote[]> {
    this.plugin.lastSearch = query

    const results = this.plugin.minisearch
      .search(query, {
        prefix: true,
        fuzzy: term => (term.length > 4 ? 0.2 : false),
        combineWith: 'AND',
        boost: { basename: 2, title: 1.5 },
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
    // console.log('Omnisearch - Results:')
    // console.log(results)

    return results.map(result => {
      const note = this.plugin.indexedNotes[result.id]
      let content = note.content
      let basename = note.basename

      // If the body contains a searched term, find its position
      // and trim the text around it
      const pos = content.toLowerCase().indexOf(result.terms[0])
      const surroundLen = 180
      if (pos > -1) {
        const from = Math.max(0, pos - surroundLen)
        const to = Math.min(content.length - 1, pos + surroundLen)
        content =
          (from > 0 ? '…' : '') +
          content.slice(from, to).trim() +
          (to < content.length - 1 ? '…' : '')
      }

      // Sort the terms from smaller to larger
      // and highlight them in the title and body
      const terms = result.terms.sort((a, b) => a.length - b.length)
      const reg = new RegExp(terms.map(escapeRegex).join('|'), 'gi')
      content = content.replace(reg, highlighter)
      basename = basename.replace(reg, highlighter)

      return { content, basename, path: note.path }
    })
  }

  renderSuggestion(value: ResultNote, el: HTMLElement): void {
    el.setAttribute('data-note-id', value.path)

    // title
    const title = el.createEl('div', { cls: 'osresult__title' })
    title.innerHTML = value.basename

    // body
    const body = el.createEl('div', { cls: 'osresult__body' })
    body.innerHTML = value.content
  }

  onChooseSuggestion(item: ResultNote): void {
    this.app.workspace.openLinkText(item.path, '')
  }
}
