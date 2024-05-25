import { Notice, TFile } from 'obsidian'
import type { DocumentRef, IndexedDocument } from './globals'
import {
  extractHeadingsFromCache,
  getAliasesFromMetadata,
  getTagsFromMetadata,
  isFileCanvas,
  isFileFromDataloomPlugin,
  isFileImage,
  isFileOffice,
  isFilePDF,
  logDebug,
  makeMD5,
  removeDiacritics,
  stripMarkdownCharacters,
} from './tools/utils'
import type { CanvasData } from 'obsidian/canvas'
import type MiniSearch from 'minisearch'
import type { AsPlainObject } from 'minisearch'
import type OmnisearchPlugin from './main'

export class CacheManager {
  /**
   * Show an empty input field next time the user opens Omnisearch modal
   */
  private nextQueryIsEmpty = false

  /**
   * The "live cache", containing all indexed vault files
   * in the form of IndexedDocuments
   */
  private documents: Map<string, IndexedDocument> = new Map()

  constructor(private plugin: OmnisearchPlugin) {}

  /**
   * Set or update the live cache with the content of the given file.
   * @param path
   */
  public async addToLiveCache(path: string): Promise<void> {
    try {
      const doc = await this.getAndMapIndexedDocument(path)
      if (!doc.path) {
        console.error(
          `Missing .path field in IndexedDocument "${doc.basename}", skipping`
        )
        return
      }
      this.documents.set(path, doc)
    } catch (e) {
      console.warn(`Omnisearch: Error while adding "${path}" to live cache`, e)
      // Shouldn't be needed, but...
      this.removeFromLiveCache(path)
    }
  }

  public removeFromLiveCache(path: string): void {
    this.documents.delete(path)
  }

  public async getDocument(path: string): Promise<IndexedDocument> {
    if (this.documents.has(path)) {
      return this.documents.get(path)!
    }
    logDebug('Generating IndexedDocument from', path)
    await this.addToLiveCache(path)
    return this.documents.get(path)!
  }

  public async addToSearchHistory(query: string): Promise<void> {
    if (!query) {
      this.nextQueryIsEmpty = true
      return
    }
    this.nextQueryIsEmpty = false
    // TODO: rename
    const database = this.plugin.cache
    let history = await database.searchHistory.toArray()
    history = history.filter(s => s.query !== query).reverse()
    history.unshift({ query })
    history = history.slice(0, 10)
    await database.searchHistory.clear()
    await database.searchHistory.bulkAdd(history)
  }

  /**
   * @returns The search history, in reverse chronological order
   */
  public async getSearchHistory(): Promise<ReadonlyArray<string>> {
    const data = (await this.plugin.cache.searchHistory.toArray())
      .reverse()
      .map(o => o.query)
    if (this.nextQueryIsEmpty) {
      data.unshift('')
    }
    return data
  }

  public getDocumentsChecksum(documents: IndexedDocument[]): string {
    return makeMD5(
      JSON.stringify(
        documents.sort((a, b) => {
          if (a.path < b.path) {
            return -1
          } else if (a.path > b.path) {
            return 1
          }
          return 0
        })
      )
    )
  }

  //#region Minisearch

  public async getMinisearchCache(): Promise<{
    paths: DocumentRef[]
    data: AsPlainObject
  } | null> {
    try {
      const cachedIndex = (
        await this.plugin.cache.minisearch.toArray()
      )[0]
      return cachedIndex
    } catch (e) {
      new Notice(
        'Omnisearch - Cache missing or invalid. Some freezes may occur while Omnisearch indexes your vault.'
      )
      console.error('Omnisearch - Error while loading Minisearch cache')
      console.error(e)
      return null
    }
  }

  public async writeMinisearchCache(
    minisearch: MiniSearch,
    indexed: Map<string, number>
  ): Promise<void> {
    const paths = Array.from(indexed).map(([k, v]) => ({ path: k, mtime: v }))
    // TODO: rename
    const database = this.plugin.cache
    await database.minisearch.clear()
    await database.minisearch.add({
      date: new Date().toISOString(),
      paths,
      data: minisearch.toJSON(),
    })
    console.log('Omnisearch - Search cache written')
  }

  public isFileIndexable(path: string): boolean {
    return this.isFilenameIndexable(path) || this.isContentIndexable(path)
  }

  //#endregion Minisearch

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

  private isFilePlaintext(path: string): boolean {
    return [...this.plugin.settings.indexedFileTypes, 'md'].some(t =>
      path.endsWith(`.${t}`)
    )
  }

  /**
   * This function is responsible for extracting the text from a file and
   * returning it as an `IndexedDocument` object.
   * @param path
   */
  private async getAndMapIndexedDocument(
    path: string
  ): Promise<IndexedDocument> {
    const app = this.plugin.app
    const file = app.vault.getAbstractFileByPath(path)
    if (!file) throw new Error(`Invalid file path: "${path}"`)
    if (!(file instanceof TFile)) throw new Error(`Not a TFile: "${path}"`)
    let content: string | null = null

    const extractor = this.plugin.getTextExtractor()

    // ** Plain text **
    // Just read the file content
    if (this.isFilePlaintext(path)) {
      content = await app.vault.cachedRead(file)
    }

    // ** Canvas **
    // Extract the text fields from the json
    else if (isFileCanvas(path)) {
      const canvas = JSON.parse(await app.vault.cachedRead(file)) as CanvasData
      let texts: string[] = []
      // Concatenate text from the canvas fields
      for (const node of canvas.nodes) {
        if (node.type === 'text') {
          texts.push(node.text)
        } else if (node.type === 'file') {
          texts.push(node.file)
        }
      }
      for (const edge of canvas.edges.filter(e => !!e.label)) {
        texts.push(edge.label!)
      }
      content = texts.join('\r\n')
    }

    // ** Dataloom plugin **
    else if (isFileFromDataloomPlugin(path)) {
      try {
        const data = JSON.parse(await app.vault.cachedRead(file))
        // data is a json object, we recursively iterate the keys
        // and concatenate the values if the key is "markdown"
        const texts: string[] = []
        const iterate = (obj: any) => {
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              iterate(obj[key])
            } else if (key === 'content') {
              texts.push(obj[key])
            }
          }
        }
        iterate(data)
        content = texts.join('\r\n')
      } catch (e) {
        console.error('Omnisearch: Error while parsing Dataloom file', path)
        console.error(e)
      }
    }

    // ** Image **
    else if (
      isFileImage(path) &&
      this.plugin.settings.imagesIndexing &&
      extractor?.canFileBeExtracted(path)
    ) {
      content = await extractor.extractText(file)
    }
    // ** PDF **
    else if (
      isFilePDF(path) &&
      this.plugin.settings.PDFIndexing &&
      extractor?.canFileBeExtracted(path)
    ) {
      content = await extractor.extractText(file)
    }

    // ** Office document **
    else if (
      isFileOffice(path) &&
      this.plugin.settings.officeIndexing &&
      extractor?.canFileBeExtracted(path)
    ) {
      content = await extractor.extractText(file)
    }

    // ** Unsupported files **
    else if (this.isFilenameIndexable(path)) {
      content = file.path
    }

    if (content === null || content === undefined) {
      // This shouldn't happen
      console.warn(`Omnisearch: ${content} content for file`, file.path)
      content = ''
    }
    const metadata = app.metadataCache.getFileCache(file)

    // Look for links that lead to non-existing files,
    // and add them to the index.
    if (metadata) {
      // // FIXME: https://github.com/scambier/obsidian-omnisearch/issues/129
      // const nonExisting = getNonExistingNotes(file, metadata)
      // for (const name of nonExisting.filter(
      //   o => !cacheManager.getLiveDocument(o)
      // )) {
      //   NotesIndex.addNonExistingToIndex(name, file.path)
      // }

      // EXCALIDRAW
      // Remove the json code
      if (metadata.frontmatter?.['excalidraw-plugin']) {
        const comments =
          metadata.sections?.filter(s => s.type === 'comment') ?? []
        for (const { start, end } of comments.map(c => c.position)) {
          content =
            content.substring(0, start.offset - 1) +
            content.substring(end.offset)
        }
      }
    }

    const tags = getTagsFromMetadata(metadata)
    return {
      basename: file.basename,
      content,
      /** Content without diacritics and markdown chars */
      cleanedContent: stripMarkdownCharacters(removeDiacritics(content)),
      path: file.path,
      mtime: file.stat.mtime,

      tags: tags,
      unmarkedTags: tags.map(t => t.replace('#', '')),
      aliases: getAliasesFromMetadata(metadata).join(''),
      headings1: metadata
        ? extractHeadingsFromCache(metadata, 1).join(' ')
        : '',
      headings2: metadata
        ? extractHeadingsFromCache(metadata, 2).join(' ')
        : '',
      headings3: metadata
        ? extractHeadingsFromCache(metadata, 3).join(' ')
        : '',
    }
  }
}
