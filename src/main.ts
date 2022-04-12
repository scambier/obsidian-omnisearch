import { Notice, Plugin, SuggestModal, TAbstractFile, TFile } from 'obsidian'
import MiniSearch from 'minisearch'
import {
  clearContent,
  escapeRegex,
  getTitleLine,
  highlighter,
  removeTitleLine,
  wait,
} from './utils'

type OmniNote = {
  path: string
  basename: string
  title: string
  body: string
}

export default class OmnisearchPlugin extends Plugin {
  minisearch: MiniSearch<OmniNote>
  lastSearch?: string
  notes: Record<string, OmniNote>

  async onload(): Promise<void> {
    await this.instantiateMinisearch()

    // Commands to display Omnisearch modal
    this.addCommand({
      id: 'show-modal',
      name: 'Open Omnisearch',
      // hotkeys: [{ modifiers: ['Mod'], key: 'o' }],
      callback: () => {
        new OmnisearchModal(this).open()
      },
    })

    // Listeners to keep the search index up-to-date
    this.registerEvent(this.app.vault.on('create', this.addToIndex.bind(this)))
    this.registerEvent(
      this.app.vault.on('delete', file => {
        this.removeFromIndex(file)
      }),
    )
    this.registerEvent(
      this.app.vault.on('modify', async file => {
        this.removeFromIndex(file)
        await this.addToIndex(file)
      }),
    )
    this.registerEvent(
      this.app.vault.on('rename', async (file, oldPath) => {
        if (file instanceof TFile && file.path.endsWith('.md')) {
          this.removeFromIndexByPath(oldPath)
          await this.addToIndex(file)
        }
      }),
    )
  }

  async instantiateMinisearch(): Promise<void> {
    this.notes = {}
    this.minisearch = new MiniSearch<OmniNote>({
      idField: 'path',
      fields: ['body', 'title', 'basename'],
    })

    // Index files that are already present
    const start = new Date().getTime()
    const files = this.app.vault.getMarkdownFiles()

    // This is basically the same behavior as MiniSearch's `addAllAsync()`.
    // We index files by batches of 10
    console.log('Omnisearch - indexing ' + files.length + ' files')
    for (let i = 0; i < files.length; ++i) {
      if (i % 10 === 0) await wait(0)
      const file = files[i]
      // console.log(file.path)
      await this.addToIndex(file)
    }

    if (files.length > 0) {
      new Notice(
        `Omnisearch - Indexed ${files.length} notes in ${
          new Date().getTime() - start
        }ms`,
      )
    }
  }

  async addToIndex(file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== 'md') return
    try {
      if (this.notes[file.path]) {
        throw new Error(`${file.basename} is already indexed`)
      }
      // Fetch content from the cache,
      // trim the markdown, remove embeds and clear wikilinks
      const content = clearContent(await this.app.vault.cachedRead(file))

      // Split the "title" (the first line/sentence) from the rest of the content
      const title = getTitleLine(content)
      const body = removeTitleLine(content)

      // Make the document and index it
      const note = { basename: file.basename, title, body, path: file.path }
      this.minisearch.add(note)
      this.notes[file.path] = note
    }
    catch (e) {
      console.trace('Error while indexing ' + file.basename)
      console.error(e)
    }
  }

  removeFromIndex(file: TAbstractFile): void {
    if (file instanceof TFile && file.path.endsWith('.md')) {
      return this.removeFromIndexByPath(file.path)
    }
  }

  removeFromIndexByPath(path: string): void {
    const note = this.notes[path]
    this.minisearch.remove(note)
    delete this.notes[path]
  }
}

class OmnisearchModal extends SuggestModal<OmniNote> {
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

  getSuggestions(query: string): OmniNote[] {
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
      const note = this.plugin.notes[result.id]
      // result.id == the file's path
      let basename = note.basename
      let title = note.title
      let body = note.body

      // If the body contains a searched term, find its position
      // and trim the text around it
      const pos = body.toLowerCase().indexOf(result.terms[0])
      const surroundLen = 180
      if (pos > -1) {
        const from = Math.max(0, pos - surroundLen)
        const to = Math.min(body.length - 1, pos + surroundLen)
        body =
          (from > 0 ? '…' : '') +
          body.slice(from, to).trim() +
          (to < body.length - 1 ? '…' : '')
      }

      // Sort the terms from smaller to larger
      // and highlight them in the title and body
      const terms = result.terms.sort((a, b) => a.length - b.length)
      const reg = new RegExp(terms.map(escapeRegex).join('|'), 'gi')
      body = body.replace(reg, highlighter)
      title = title.replace(reg, highlighter)
      basename = basename.replace(reg, highlighter)

      return {
        path: result.id,
        basename,
        title,
        body,
      }
    })
  }

  renderSuggestion(value: OmniNote, el: HTMLElement): void {
    el.setAttribute('data-note-id', value.path)
    // title
    const title = el.createEl('div', { cls: 'osresult__title' })
    title.innerHTML = value.title

    // filename
    const name = document.createElement('span')
    name.className = 'osresult__name'
    name.innerHTML = value.basename

    // body
    const body = document.createElement('span')
    body.innerHTML = value.body

    // body container
    const bodyContainer = el.createEl('div', { cls: 'osresult__body' })
    bodyContainer.appendChild(name)
    bodyContainer.appendChild(body)
  }

  onChooseSuggestion(item: OmniNote): void {
    this.app.workspace.openLinkText(item.path, '')
  }
}
