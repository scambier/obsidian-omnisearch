import { App, Plugin, SuggestModal, TFile } from 'obsidian'
import MiniSearch from 'minisearch'
import removeMarkdown from 'remove-markdown'

type OmnisearchMatch = {
  path: string
  content: string
}

export default class OmnisearchPlugin extends Plugin {
  minisearch: MiniSearch<OmnisearchMatch>
  files: TFile[]
  contents: Record<string, string>

  async onload(): Promise<void> {
    this.contents = {}
    this.minisearch = new MiniSearch<OmnisearchMatch>({
      idField: 'path',
      fields: ['content', 'title'],
      storeFields: ['path'],
      extractField: (document, fieldName) => {
        if (fieldName === 'title') return getNoteTitle(document.content)
        return (document as any)[fieldName] as string
      },
    })

    this.app.workspace.onLayoutReady(async () => {
      this.files = this.app.vault.getMarkdownFiles()
      for (const file of this.files) {
        const content = await this.app.vault.cachedRead(file)
        this.contents[file.path] = truncateBody(getNoteBody(content))
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
  }

  getSuggestions(query: string): OmnisearchMatch[] {
    const results = this.plugin.minisearch.search(query, {
      prefix: true,
      fuzzy: term => (term.length > 4 ? 0.2 : false),
      combineWith: 'AND',
      // processTerm: term => term.length <= minLength ? false : term,
      boost: { title: 2 },
    })
    return results.map(result => {
      const file = this.plugin.files.find(f => f.path === result.id)
      return {
        path: file.path,
        content: this.plugin.contents[file.path],
      }
    })
  }

  renderSuggestion(value: OmnisearchMatch, el: HTMLElement) {
    el.createEl('div', { text: value.path })
    el.createEl('small', { text: value.content })
  }

  onChooseSuggestion(item: OmnisearchMatch, evt: MouseEvent | KeyboardEvent) {
    throw new Error('Method not implemented.')
  }
}

function truncateBody(body: string): string {
  return body.substring(0, 200) + (body.length > 0 ? '...' : '')
}
function getNoteTitle(note: string): string {
  return getFirstLine(removeMd(note))
}
function getNoteBody(contents: string): string {
  return truncateFirstLine(removeMd(contents))
}

function getFirstLine(text: string): string {
  return splitLines(text.trim())[0]
}
function splitLines(text: string): string[] {
  return text.split(/\r?\n|\r/)
}

function removeMd(text: string): string {
  return removeMarkdown(removeFrontMatter(text))
}
function removeFrontMatter(text: string): string {
  // Regex to recognize YAML Front Matter (at beginning of file, 3 hyphens, than any charecter, including newlines, then 3 hyphens).
  const YAMLFrontMatter = /^---\s*\n(.*?)\n?^---\s?/ms
  return text.replace(YAMLFrontMatter, '')
}

function truncateFirstLine(text: string): string {
  // https://stackoverflow.com/questions/2528076/delete-a-line-of-text-in-javascript
  const lines = splitLines(text.trim())
  lines.splice(0, 1)
  return lines.join('\n')
}
