import { Plugin, SuggestModal } from 'obsidian'
import MiniSearch from 'minisearch'
import removeMarkdown from 'remove-markdown'

type Note = {
  path: string
  name: string
  title: string
  body: string
}

const regexWikilink = /\[\[(?<name>.+?)(\|(?<alias>.+?))?\]\]/g
const regexEmbed = /!\[\[.+?\]\]/g

export default class OmnisearchPlugin extends Plugin {
  minisearch: MiniSearch<Note>
  lastSearch?: string

  async instantiateMinisearch(): Promise<void> {
    this.minisearch = new MiniSearch<Note>({
      idField: 'path',
      fields: ['body', 'title', 'name'],
      storeFields: ['body', 'title', 'name'],
    })

    const files = this.app.vault.getMarkdownFiles()
    for (const file of files) {
      // Fetch content from the cache,
      // trim the markdown, remove embeds and clear wikilinks
      const content = clearContent(await this.app.vault.cachedRead(file))
        .replace(regexEmbed, '')
        .replace(regexWikilink, (sub, name, sep, alias) => alias ?? name)

      // Split the "title" (the first line/sentence) from the rest of the content
      const title = getFirstLine(content)
      const body = removeFirstLine(content)

      // Index those fields inside Minisearch
      this.minisearch.add({ title, body, path: file.path, name: file.name })
    }
  }

  async onload(): Promise<void> {
    this.app.workspace.onLayoutReady(async () => {
      await this.instantiateMinisearch()
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

class OmnisearchModal extends SuggestModal<Note> {
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

  onOpen(): void {
    this.inputEl.focus()
    if (this.plugin.lastSearch) {
      const event = new Event('input', {
        bubbles: true,
        cancelable: true,
      })
      this.inputEl.value = this.plugin.lastSearch
      this.inputEl.dispatchEvent(event)
      this.inputEl.select()
    }
  }

  getSuggestions(query: string): Note[] {
    console.log('query: ' + query)
    this.plugin.lastSearch = query

    const results = this.plugin.minisearch
      .search(query, {
        prefix: true,
        fuzzy: term => (term.length > 4 ? 0.2 : false),
        combineWith: 'AND',
        boost: { name: 2, title: 1.5 },
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
    console.log(results)

    return results.map(result => {
      // result.id == the file's path
      let name = result.name
      let title = result.title
      let body = result.body

      // If the body contains a searched term, find its position
      // and trim the text around it
      const pos = body.toLowerCase().indexOf(result.terms[0])
      const surroundLen = 200
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
      const reg = new RegExp(terms.join('|'), 'gi')
      body = body.replace(reg, highlighter)
      title = title.replace(reg, highlighter)
      name = name.replace(reg, highlighter)

      return {
        path: result.id,
        name,
        title,
        body,
      }
    })
  }

  renderSuggestion(value: Note, el: HTMLElement): void {
    // title
    const title = el.createEl('div', { cls: 'osresult__title' })
    title.innerHTML = value.title

    // filename
    const name = el.createEl('span', { cls: 'osresult__name' })
    name.innerHTML = value.name
    title.appendChild(name)

    // body
    const body = el.createEl('div', { cls: 'osresult__body' })
    body.innerHTML = value.body
  }

  onChooseSuggestion(item: Note, evt: MouseEvent | KeyboardEvent): void {
    // this.app.workspace
    this.app.workspace.openLinkText(item.path, '')
  }
}

function highlighter(str: string): string {
  return '<span class="search-result-file-matched-text">' + str + '</span>'
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

function splitLines(text: string): string[] {
  return text.split(/\r?\n|\r|(\. )/)
}

function removeFrontMatter(text: string): string {
  // Regex to recognize YAML Front Matter (at beginning of file, 3 hyphens, than any charecter, including newlines, then 3 hyphens).
  const YAMLFrontMatter = /^---\s*\n(.*?)\n?^---\s?/ms
  return text.replace(YAMLFrontMatter, '')
}
