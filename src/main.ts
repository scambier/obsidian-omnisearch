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
      fields: ['content', 'title'],
      storeFields: ['path'],
      extractField: (document, fieldName) => {
        if (fieldName === 'title') return getFirstLine(document.content)
        return (document as any)[fieldName] as string
      },
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
      console.log('minisearch loaded')
      console.log(this.files.length + ' notes')
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
      const content = this.plugin.contents[file.path]

      // Find position of result.terms[0]
      const pos = content.toLowerCase().indexOf(result.terms[0].toLowerCase())

      // Splice to get 150 chars before and after
      let sliced = removeFirstLine(
        content.slice(
          Math.max(0, pos - 150),
          Math.min(content.length - 1, pos + 150),
        ),
      )

      // Highlight the word
      const reg = new RegExp(result.terms[0], 'gi')
      sliced = sliced.replace(
        reg,
        str =>
          '<span class="search-result-file-matched-text">' + str + '</span>',
      )

      return {
        path: file.path,
        title: getFirstLine(content),
        body: sliced,
      }
    })
  }

  renderSuggestion(value: OmnisearchMatch, el: HTMLElement): void {
    el.createEl('div', { cls: 'osresult__title', text: value.title })
    const body = el.createEl('div', { cls: 'osresult__body' })
    body.innerHTML = value.body
  }

  onChooseSuggestion(
    item: OmnisearchMatch,
    evt: MouseEvent | KeyboardEvent,
  ): void {
    throw new Error('Method not implemented.')
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
  return text.split(/\r?\n|\r/)
}

function removeFrontMatter(text: string): string {
  // Regex to recognize YAML Front Matter (at beginning of file, 3 hyphens, than any charecter, including newlines, then 3 hyphens).
  const YAMLFrontMatter = /^---\s*\n(.*?)\n?^---\s?/ms
  return text.replace(YAMLFrontMatter, '')
}
