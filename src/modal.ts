import { MarkdownView, SuggestModal, TFile } from 'obsidian'
import type { ResultNote } from './globals'
import type OmnisearchPlugin from './main'
import { escapeRegex, getAllIndexes, highlighter } from './utils'
import Component from './Component.svelte'

export class OmnisearchModal extends SuggestModal<ResultNote> {
  private plugin: OmnisearchPlugin
  private selectedNoteId?: string
  private mutationObserver?: MutationObserver

  constructor(plugin: OmnisearchPlugin) {
    super(plugin.app)
    this.plugin = plugin

    this.modalEl.addClass('omnisearch-modal')

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

    if (ev.ctrlKey || ev.metaKey) {
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
        if (e instanceof Error && e.message === 'File already exists.') {
          // Open the existing file instead of creating it
          await this.app.workspace.openLinkText(this.inputEl.value, '')
        }
        else {
          console.error(e)
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
      const id =
        (record?.target as HTMLElement)?.getAttribute('data-note-id') ?? null
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
      this.inputEl.spellcheck = false
    }

    this.inputEl.onkeydown = this.onKeydown.bind(this)
  }

  onClose(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
    }
  }

  async getSuggestions(query: string): Promise<ResultNote[]> {
    this.plugin.lastSearch = query

    const results = this.plugin.minisearch
      .search(query, {
        prefix: true,
        fuzzy: term => (term.length > 4 ? 0.2 : false),
        combineWith: 'AND',
        boost: { basename: 2, headings1: 1.5, headings2: 1.3, headings3: 1.1 },
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
    // console.log(`Omnisearch - Results for "${query}"`)
    // console.log(results)

    const suggestions = await Promise.all(
      results.map(async result => {
        const file = this.app.vault.getAbstractFileByPath(result.id) as TFile
        // const metadata = this.app.metadataCache.getFileCache(file)
        let content = (await this.app.vault.cachedRead(file)).toLowerCase()
        let basename = file.basename

        // Sort the terms from smaller to larger
        // and highlight them in the title and body
        const terms = result.terms.sort((a, b) => a.length - b.length)
        const reg = new RegExp(terms.map(escapeRegex).join('|'), 'gi')
        const matches = getAllIndexes(content, reg)

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

        // console.log(matches)
        content = content.replace(reg, highlighter)
        basename = basename.replace(reg, highlighter)

        const resultNote: ResultNote = {
          content,
          basename,
          path: file.path,
          matches,
          occurence: 0,
        }
        return resultNote
      }),
    )

    return suggestions
  }

  renderSuggestion(value: ResultNote, el: HTMLElement): void {
    const component = new Component({
      target: el,
      props: { variable: 1 },
    })
    el.setAttribute('data-note-id', value.path)
    el.addClass('omnisearch-result')

    // title
    const title = el.createEl('div', { cls: 'omnisearch-result__title' })
    title.innerHTML = value.basename

    // body
    const body = el.createEl('div', { cls: 'omnisearch-result__body' })
    body.innerHTML = value.content
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
