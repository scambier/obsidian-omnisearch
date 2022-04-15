import { Notice, Plugin, TAbstractFile, TFile } from 'obsidian'
import MiniSearch from 'minisearch'
import type { IndexedNote } from './globals'
import { escapeHTML, extractHeadingsFromCache, wait } from './utils'
import { OmnisearchModal } from './modal'

export default class OmnisearchPlugin extends Plugin {
  minisearch!: MiniSearch<IndexedNote>
  lastSearch?: string
  indexedNotes: Record<string, IndexedNote> = {}

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
    this.registerEvent(
      this.app.vault.on('create', file => {
        this.addToIndex(file)
      }),
    )
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
    this.indexedNotes = {}
    this.minisearch = new MiniSearch({
      idField: 'path',
      fields: ['basename', 'content', 'headings1', 'headings2', 'headings3'],
    })

    // Index files that are already present
    const start = new Date().getTime()
    const files = this.app.vault.getMarkdownFiles()

    // This is basically the same behavior as MiniSearch's `addAllAsync()`.
    // We index files by batches of 10
    if (files.length) {
      console.log('Omnisearch - indexing ' + files.length + ' files')
    }
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
      // console.log(`Omnisearch - adding ${file.path} to index`)
      const fileCache = this.app.metadataCache.getFileCache(file)
      // console.log(fileCache)

      if (this.indexedNotes[file.path]) {
        throw new Error(`${file.basename} is already indexed`)
      }
      // Fetch content from the cache,
      // trim the markdown, remove embeds and clear wikilinks
      const content = escapeHTML(await this.app.vault.cachedRead(file))

      // Purge HTML before indexing
      const tmp = document.createElement('div')
      tmp.innerHTML = content

      // Make the document and index it
      const note: IndexedNote = {
        basename: file.basename,
        content: tmp.innerText, // content,
        path: file.path,
        headings1: fileCache
          ? extractHeadingsFromCache(fileCache, 1).join(' ')
          : '',
        headings2: fileCache
          ? extractHeadingsFromCache(fileCache, 2).join(' ')
          : '',
        headings3: fileCache
          ? extractHeadingsFromCache(fileCache, 3).join(' ')
          : '',
      }
      this.minisearch.add(note)
      this.indexedNotes[file.path] = note
    }
    catch (e) {
      console.trace('Error while indexing ' + file.basename)
      console.error(e)
    }
  }

  removeFromIndex(file: TAbstractFile): void {
    if (file instanceof TFile && file.path.endsWith('.md')) {
      // console.log(`Omnisearch - removing ${file.path} from index`)
      return this.removeFromIndexByPath(file.path)
    }
  }

  removeFromIndexByPath(path: string): void {
    const note = this.indexedNotes[path]
    this.minisearch.remove(note)
    delete this.indexedNotes[path]
  }
}
