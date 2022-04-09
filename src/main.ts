import { App, Plugin, SuggestModal, TFile } from 'obsidian'
import MiniSearch from 'minisearch'
import removeMarkdown from 'remove-markdown'

type OmnisearchMatch = {
  path: string
  body: string
  title: string
}

type Note = {
  path: string
  content: string
}

export default class OmnisearchPlugin extends Plugin {
  minisearch: MiniSearch<Note>
  files: TFile[]
  contents: Record<string, string>

  setupIndex(): void {
    this.minisearch = new MiniSearch<Note>({
      idField: 'path',
      fields: ['content', 'title', 'path'],
      // storeFields: ['path'],
    })
  }

  async onload(): Promise<void> {
    this.contents = {}

    this.setupIndex()

    this.app.workspace.onLayoutReady(async () => {
      this.files = this.app.vault.getMarkdownFiles()
      for (const file of this.files) {
        const content = await this.app.vault.cachedRead(file)
        this.contents[file.path] = clearContent(content) // truncateText(clearContent(content))
        this.minisearch.add({ content, path: file.path })
      }
    })

    this.addCommand({
      id: 'show-modal',
      name: 'Open Omnisearch',
      hotkeys: [{ modifiers: ['Mod'], key: 'o' }],
      callback: () => {
        new OmnisearchModal(this).open()
      },
    })
  }
}

class OmnisearchModal extends SuggestModal<OmnisearchMatch> {
  plugin: OmnisearchPlugin

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

  getSuggestions(query: string): OmnisearchMatch[] {
    const results = this.plugin.minisearch
      .search(query, {
        prefix: true,
        fuzzy: term => (term.length > 4 ? 0.2 : false),
        combineWith: 'AND',
        // processTerm: term => term.length <= minLength ? false : term,
        boost: { title: 2 },
      })
      .sort((a, b) => b.score - a.score)

    return results.map(result => {
      const file = this.plugin.files.find(f => f.path === result.id)
      let title = getFirstLine(this.plugin.contents[file.path])
      let body = removeFirstLine(this.plugin.contents[file.path])

      // Highlight the words
      const highlight = (str: string): string =>
        '<span class="search-result-file-matched-text">' + str + '</span>'

      const pos = body.toLowerCase().indexOf(result.terms[0])
      if (pos > -1) {
        const from = Math.max(0, pos - 150)
        const to = Math.min(body.length - 1, pos + 150)
        body =
          (from > 0 ? '…' : '') +
          body.slice(from, to).trim() +
          (to < body.length - 1 ? '…' : '')
      }

      result.terms
        .sort((a, b) => a.length - b.length)
        .forEach(term => {
          term = term.toLowerCase()

          term = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
          const reg = new RegExp(term, 'gi')
          body = body.replace(reg, highlight)
          title = title.replace(reg, highlight)
        })

      return {
        path: file.path,
        title,
        body,
      }
    })
  }

  renderSuggestion(value: OmnisearchMatch, el: HTMLElement): void {
    const title = el.createEl('div', { cls: 'osresult__title' })
    title.innerHTML = value.title
    const body = el.createEl('div', { cls: 'osresult__body' })
    body.innerHTML = value.body
  }

  onChooseSuggestion(
    item: OmnisearchMatch,
    evt: MouseEvent | KeyboardEvent,
  ): void {
    // this.app.workspace
    this.app.workspace.openLinkText(item.path, '')
  }
}

/**
 * Strips the markdown and frontmatter
 * @param text
 */
function clearContent(text: string): string {
  return removeMarkdown(removeFrontMatter(text))
}

/**
 * Returns the first line of the text
 * @param text
 * @returns
 */
function getFirstLine(text: string): string {
  return splitLines(text.trim())[0]
}

/**
 * Removes the first line of the text
 * @param text
 * @returns
 */
function removeFirstLine(text: string): string {
  // https://stackoverflow.com/questions/2528076/delete-a-line-of-text-in-javascript
  const lines = splitLines(text.trim())
  lines.splice(0, 1)
  return lines.join('\n')
}

function truncateText(text: string, len = 500): string {
  return text.substring(0, len) + (text.length > 0 ? '...' : '')
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n|\r|\./)
}

function removeFrontMatter(text: string): string {
  // Regex to recognize YAML Front Matter (at beginning of file, 3 hyphens, than any charecter, including newlines, then 3 hyphens).
  const YAMLFrontMatter = /^---\s*\n(.*?)\n?^---\s?/ms
  return text.replace(YAMLFrontMatter, '')
}
