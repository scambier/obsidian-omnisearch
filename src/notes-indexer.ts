import type { TAbstractFile } from 'obsidian'
import type OmnisearchPlugin from './main'
import { removeAnchors } from './tools/notes'
import type { IndexedDocument } from './globals'
import {
  isFileCanvas,
  isFileFromDataloomPlugin,
  isFileImage,
  isFilePDF,
} from './tools/utils'

export class NotesIndexer {
  private notesToReindex = new Set<TAbstractFile>()

  constructor(private plugin: OmnisearchPlugin) {}

  /**
   * Updated notes are not reindexed immediately for performance reasons.
   * They're added to a list, and reindex is done the next time we open Omnisearch.
   */
  public markNoteForReindex(note: TAbstractFile): void {
    this.notesToReindex.add(note)
  }

  public async refreshIndex(): Promise<void> {
    const paths = [...this.notesToReindex].map(n => n.path)
    if (paths.length) {
      const searchEngine = this.plugin.searchEngine
      searchEngine.removeFromPaths(paths)
      await searchEngine.addFromPaths(paths)
      this.notesToReindex.clear()
    }
  }

  public isFileIndexable(path: string): boolean {
    return this.isFilenameIndexable(path) || this.isContentIndexable(path)
  }

  public isContentIndexable(path: string): boolean {
    const settings = this.plugin.settings
    const hasTextExtractor = !!this.plugin.getTextExtractor()
    const canIndexPDF = hasTextExtractor && settings.PDFIndexing
    const canIndexImages = hasTextExtractor && settings.imagesIndexing
    return (
      this.isFilePlaintext(path) ||
      isFileCanvas(path) ||
      isFileFromDataloomPlugin(path) ||
      (canIndexPDF && isFilePDF(path)) ||
      (canIndexImages && isFileImage(path))
    )
  }

  public isFilenameIndexable(path: string): boolean {
    return (
      this.canIndexUnsupportedFiles() ||
      this.isFilePlaintext(path) ||
      isFileCanvas(path) ||
      isFileFromDataloomPlugin(path)
    )
  }

  public canIndexUnsupportedFiles(): boolean {
    return (
      this.plugin.settings.unsupportedFilesIndexing === 'yes' ||
      (this.plugin.settings.unsupportedFilesIndexing === 'default' &&
        !!this.plugin.app.vault.getConfig('showUnsupportedFiles'))
    )
  }

  /**
   * Index a non-existing note.
   * Useful to find internal links that lead (yet) to nowhere
   * @param name
   * @param parent The note referencing the
   */
  public addNonExistingToIndex(name: string, parent: string): void {
    name = removeAnchors(name)
    const filename = name + (name.endsWith('.md') ? '' : '.md')

    const note: IndexedDocument = {
      path: filename,
      basename: name,
      mtime: 0,

      content: '',
      cleanedContent: '',
      tags: [],
      unmarkedTags: [],
      aliases: '',
      headings1: '',
      headings2: '',
      headings3: '',

      doesNotExist: true,
      parent,
    }
    // searchEngine.addDocuments([note])
  }

  public isFilePlaintext(path: string): boolean {
    return [...this.plugin.settings.indexedFileTypes, 'md'].some(t =>
      path.endsWith(`.${t}`)
    )
  }
}
