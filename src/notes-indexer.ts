import type { TAbstractFile } from 'obsidian'
import type OmnisearchPlugin from './main'
import { removeAnchors } from './tools/notes'
import type { IndexedDocument } from './globals'
import {
  isFileCanvas,
  isFileBase,
  isFileFromDataloom,
  isFileImage,
  isFilePDF,
  logVerbose,
} from './tools/utils'

export class NotesIndexer {
  private notesToReindex = new Set<TAbstractFile>()

  constructor(private plugin: OmnisearchPlugin) {}

  /**
   * Updated notes are not reindexed immediately for performance reasons.
   * They're added to a list, and reindex is done the next time we open Omnisearch.
   */
  public flagNoteForReindex(note: TAbstractFile): void {
    this.notesToReindex.add(note)
  }

  public async refreshIndex(): Promise<void> {
    const queued = [...this.notesToReindex]

    // A note can be deleted after being flagged for reindexing. Skip those,
    // and make sure their stale path is removed from the search index.
    const existing = queued.filter(file =>
      this.plugin.app.vault.getAbstractFileByPath(file.path)
    )
    for (const file of existing) {
      logVerbose('Updating file', file.path)
      await this.plugin.documentsRepository.addDocument(file.path)
    }

    const existingPaths = existing.map(file => file.path)
    if (existingPaths.length) {
      this.plugin.searchEngine.removeFromPaths(existingPaths)
      await this.plugin.searchEngine.addFromPaths(existingPaths)
    }

    const deletedPaths = queued
      .filter(file => !existing.includes(file))
      .map(file => file.path)
    if (deletedPaths.length) {
      this.plugin.searchEngine.removeFromPaths(deletedPaths)
    }

    this.notesToReindex.clear()
  }

  public isFileIndexable(path: string): boolean {
    // Skip excluded files when hideExcluded is enabled
    if (
      this.plugin.settings.hideExcluded &&
      this.plugin.app.metadataCache.isUserIgnored &&
      this.plugin.app.metadataCache.isUserIgnored(path)
    ) {
      return false
    }

    return this.isFilenameIndexable(path) || this.isContentIndexable(path)
  }

  public isContentIndexable(path: string): boolean {
    const settings = this.plugin.settings
    const hasTextExtractor = !!this.plugin.getTextExtractor()
    const hasAIImageAnalyzer = !!this.plugin.getAIImageAnalyzer()
    const canIndexPDF = hasTextExtractor && settings.PDFIndexing
    const canIndexImages = hasTextExtractor && settings.imagesIndexing
    const canIndexImagesAI = hasAIImageAnalyzer && settings.aiImageIndexing
    return (
      this.isFilePlaintext(path) ||
      isFileCanvas(path) ||
      isFileFromDataloom(path) ||
      (canIndexPDF && isFilePDF(path)) ||
      (canIndexImages && isFileImage(path)) ||
      (canIndexImagesAI && isFileImage(path))
    )
  }

  public isFilenameIndexable(path: string): boolean {
    return (
      this.canIndexUnsupportedFiles() ||
      this.isFilePlaintext(path) ||
      isFileCanvas(path) ||
      isFileBase(path) ||
      isFileFromDataloom(path)
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
  public generateIndexableNonexistingDocument(
    name: string,
    parent: string
  ): IndexedDocument {
    name = removeAnchors(name)
    const filename = name + (name.endsWith('.md') ? '' : '.md')

    return {
      path: filename,
      basename: name,
      displayTitle: '',
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
  }

  public isFilePlaintext(path: string): boolean {
    return (
      [...this.plugin.settings.indexedFileTypes, 'md'].some(t =>
        path.endsWith(`.${t}`)
      ) ||
      (this.plugin.settings.indexFilesWithoutExtension && !path.includes('.'))
    )
  }
}
