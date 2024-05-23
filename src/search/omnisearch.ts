import MiniSearch, { type Options, type SearchResult } from 'minisearch'
import type { DocumentRef, IndexedDocument, ResultNote } from '../globals'

import { chunkArray, logDebug, removeDiacritics } from '../tools/utils'
import { Notice } from 'obsidian'
import type { Query } from './query'
import { cacheManager } from '../cache-manager'
import { sortBy } from 'lodash-es'
import { getMatches, stringsToRegex } from 'src/tools/text-processing'
import { tokenizeForIndexing, tokenizeForSearch } from './tokenizer'
import { getObsidianApp } from '../stores/obsidian-app'
import { getSettings } from 'src/settings'

export class Omnisearch {

  private static instance: Omnisearch

  app = getObsidianApp()
  settings = getSettings()

  public static getInstance(): Omnisearch {
    if (!Omnisearch.instance) {
      Omnisearch.instance = new Omnisearch();
    }
    return Omnisearch.instance;
  }

  public static readonly options: Options<IndexedDocument> = {
    tokenize: tokenizeForIndexing,
    extractField: (doc, fieldName) => {
      if (fieldName === 'directory') {
        // return path without the filename
        const parts = doc.path.split('/')
        parts.pop()
        return parts.join('/')
      }
      return (doc as any)[fieldName]
    },
    processTerm: (term: string) =>
      (getSettings().ignoreDiacritics ? removeDiacritics(term) : term).toLowerCase(),
    idField: 'path',
    fields: [
      'basename',
      // Different from `path`, since `path` is the unique index and needs to include the filename
      'directory',
      'aliases',
      'content',
      'headings1',
      'headings2',
      'headings3',
    ],
    storeFields: ['tags'],
    logger(_level, _message, code) {
      if (code === 'version_conflict') {
        new Notice(
          'Omnisearch - Your index cache may be incorrect or corrupted. If this message keeps appearing, go to Settings to clear the cache.',
          5000
        )
      }
    },
  }

  private minisearch: MiniSearch
  /** Map<path, mtime> */
  private indexedDocuments: Map<string, number> = new Map()
  // private previousResults: SearchResult[] = []
  // private previousQuery: Query | null = null

  private constructor() {
    this.minisearch = new MiniSearch(Omnisearch.options)
  }

  /**
   * Return true if the cache is valid
   */
  async loadCache(): Promise<boolean> {
    const cache = await cacheManager.getMinisearchCache()
    if (cache) {
      this.minisearch = await MiniSearch.loadJSAsync(cache.data, Omnisearch.options)
      this.indexedDocuments = new Map(cache.paths.map(o => [o.path, o.mtime]))
      return true
    }
    console.log('Omnisearch - No cache found')
    return false
  }

  /**
   * Returns the list of documents that need to be reindexed
   * @param docs
   */
  getDiff(docs: DocumentRef[]): {
    toAdd: DocumentRef[]
    toRemove: DocumentRef[]
  } {
    const docsMap = new Map(docs.map(d => [d.path, d.mtime]))

    // console.log(this.indexedDocuments)
    const toAdd = docs.filter(
      d =>
        !this.indexedDocuments.has(d.path) ||
        this.indexedDocuments.get(d.path) !== d.mtime
    )
    // console.log(toAdd)
    const toRemove = [...this.indexedDocuments]
      .filter(
        ([path, mtime]) => !docsMap.has(path) || docsMap.get(path) !== mtime
      )
      .map(o => ({ path: o[0], mtime: o[1] }))
    return { toAdd, toRemove }
  }

  /**
   * Add notes/PDFs/images to the search index
   * @param paths
   */
  public async addFromPaths(paths: string[]): Promise<void> {
    logDebug('Adding files', paths)
    let documents = (
      await Promise.all(
        paths.map(async path => await cacheManager.getDocument(path))
      )
    ).filter(d => !!d?.path)
    logDebug('Sorting documents to first index markdown')
    // Index markdown files first
    documents = sortBy(documents, d => (d.path.endsWith('.md') ? 0 : 1))

    // If a document is already added, discard it
    this.removeFromPaths(
      documents.filter(d => this.indexedDocuments.has(d.path)).map(d => d.path)
    )

    // Split the documents in smaller chunks to add them to minisearch
    const chunkedDocs = chunkArray(documents, 500)
    for (const docs of chunkedDocs) {
      logDebug('Indexing into search engine', docs)
      // Update the list of indexed docs
      docs.forEach(doc => this.indexedDocuments.set(doc.path, doc.mtime))

      // Discard files that may have been already added (though it shouldn't happen)
      const alreadyAdded = docs.filter(doc => this.minisearch.has(doc.path))
      this.removeFromPaths(alreadyAdded.map(o => o.path))

      // Add docs to minisearch
      await this.minisearch.addAllAsync(docs)
    }
  }

  /**
   * Discard a document from minisearch
   * @param paths
   */
  public removeFromPaths(paths: string[]): void {
    paths.forEach(p => this.indexedDocuments.delete(p))
    // Make sure to not discard a file that we don't have
    const existing = paths.filter(p => this.minisearch.has(p))
    this.minisearch.discardAll(existing)
  }

  /**
   * Searches the index for the given query,
   * and returns an array of raw results
   */
  public async search(
    query: Query,
    options: { prefixLength: number; singleFilePath?: string }
  ): Promise<SearchResult[]> {
    if (query.isEmpty()) {
      // this.previousResults = []
      // this.previousQuery = null
      return []
    }

    logDebug('=== New search ===')
    logDebug('Starting search for', query)

    let fuzziness: number
    switch (this.settings.fuzziness) {
      case '0':
        fuzziness = 0
        break
      case '1':
        fuzziness = 0.1
        break
      default:
        fuzziness = 0.2
        break
    }

    const searchTokens = tokenizeForSearch(query.segmentsToStr())
    logDebug(JSON.stringify(searchTokens, null, 1))
    let results = this.minisearch.search(searchTokens, {
      prefix: term => term.length >= options.prefixLength,
      // length <= 3: no fuzziness
      // length <= 5: fuzziness of 10%
      // length > 5: fuzziness of 20%
      fuzzy: term =>
        term.length <= 3 ? 0 : term.length <= 5 ? fuzziness / 2 : fuzziness,
      boost: {
        basename: this.settings.weightBasename,
        directory: this.settings.weightDirectory,
        aliases: this.settings.weightBasename,
        headings1: this.settings.weightH1,
        headings2: this.settings.weightH2,
        headings3: this.settings.weightH3,
        tags: this.settings.weightUnmarkedTags,
        unmarkedTags: this.settings.weightUnmarkedTags,
      },
      // The query is already tokenized, don't tokenize again
      tokenize: text => [text],
    })

    logDebug('Found', results.length, 'results')

    // Filter query results to only keep files that match query.query.ext (if any)
    if (query.query.ext?.length) {
      results = results.filter(r => {
        // ".can" should match ".canvas"
        const ext = '.' + r.id.split('.').pop()
        return query.query.ext?.some(e =>
          ext.startsWith(e.startsWith('.') ? e : '.' + e)
        )
      })
    }

    // Filter query results that match the path
    if (query.query.path) {
      results = results.filter(r =>
        query.query.path?.some(p =>
          (r.id as string).toLowerCase().includes(p.toLowerCase())
        )
      )
    }
    if (query.query.exclude.path) {
      results = results.filter(
        r =>
          !query.query.exclude.path?.some(p =>
            (r.id as string).toLowerCase().includes(p.toLowerCase())
          )
      )
    }

    if (!results.length) {
      return []
    }

    if (options.singleFilePath) {
      return results.filter(r => r.id === options.singleFilePath)
    }

    logDebug(
      'searching with downranked folders',
      this.settings.downrankedFoldersFilters
    )

    // Hide or downrank files that are in Obsidian's excluded list
    if (this.settings.hideExcluded) {
      // Filter the files out
      results = results.filter(
        result =>
          !(
            this.app.metadataCache.isUserIgnored &&
            this.app.metadataCache.isUserIgnored(result.id)
          )
      )
    } else {
      // Just downrank them
      results.forEach(result => {
        if (
          this.app.metadataCache.isUserIgnored &&
          this.app.metadataCache.isUserIgnored(result.id)
        ) {
          result.score /= 10
        }
      })
    }

    // Extract tags from the query
    const tags = query.getTags()

    for (const result of results) {
      const path = result.id
      if (this.settings.downrankedFoldersFilters.length > 0) {
        // downrank files that are in folders listed in the downrankedFoldersFilters
        let downrankingFolder = false
        this.settings.downrankedFoldersFilters.forEach(filter => {
          if (path.startsWith(filter)) {
            // we don't want the filter to match the folder sources, e.g.
            // it needs to match a whole folder name
            if (path === filter || path.startsWith(filter + '/')) {
              logDebug('searching with downranked folders in path: ', path)
              downrankingFolder = true
            }
          }
        })
        if (downrankingFolder) {
          result.score /= 10
        }
        const pathParts = path.split('/')
        const pathPartsLength = pathParts.length
        for (let i = 0; i < pathPartsLength; i++) {
          const pathPart = pathParts[i]
          if (this.settings.downrankedFoldersFilters.includes(pathPart)) {
            result.score /= 10
            break
          }
        }
      }

      // Boost custom properties
      const metadata = this.app.metadataCache.getCache(path)
      if (metadata) {
        for (const { name, weight } of this.settings.weightCustomProperties) {
          const values = metadata?.frontmatter?.[name]
          if (values && result.terms.some(t => values.includes(t))) {
            logDebug(`Boosting field "${name}" x${weight} for ${path}`)
            result.score *= weight
          }
        }
      }

      // Put the results with tags on top
      for (const tag of tags) {
        if ((result.tags ?? []).includes(tag)) {
          result.score *= 100
        }
      }
    }
    logDebug('Sorting and limiting results')

    // Sort results and keep the 50 best
    results = results.sort((a, b) => b.score - a.score).slice(0, 50)

    if (results.length) logDebug('First result:', results[0])

    const documents = await Promise.all(
      results.map(async result => await cacheManager.getDocument(result.id))
    )

    // If the search query contains quotes, filter out results that don't have the exact match
    const exactTerms = query.getExactTerms()
    if (exactTerms.length) {
      logDebug('Filtering with quoted terms: ', exactTerms)
      results = results.filter(r => {
        const document = documents.find(d => d.path === r.id)
        const title = document?.path.toLowerCase() ?? ''
        const content = (document?.cleanedContent ?? '').toLowerCase()
        return exactTerms.every(
          q => content.includes(q) || removeDiacritics(title).includes(q)
        )
      })
    }

    // If the search query contains exclude terms, filter out results that have them
    const exclusions = query.query.exclude.text
    if (exclusions.length) {
      logDebug('Filtering with exclusions')
      results = results.filter(r => {
        const content = (
          documents.find(d => d.path === r.id)?.content ?? ''
        ).toLowerCase()
        return exclusions.every(q => !content.includes(q))
      })
    }

    logDebug('Deduping')
    // FIXME:
    // Dedupe results - clutch for https://github.com/scambier/obsidian-omnisearch/issues/129
    results = results.filter(
      (result, index, arr) => arr.findIndex(t => t.id === result.id) === index
    )

    // this.previousQuery = query
    // this.previousResults = results

    return results
  }

  /**
   * Searches the index, and returns an array of ResultNote objects.
   * If we have the singleFile option set,
   * the array contains a single result from that file
   * @param query
   * @param options
   * @returns
   */
  public async getSuggestions(
    query: Query,
    options?: Partial<{ singleFilePath?: string }>
  ): Promise<ResultNote[]> {
    // Get the raw results
    let results: SearchResult[]
    if (this.settings.simpleSearch) {
      results = await this.search(query, {
        prefixLength: 3,
        singleFilePath: options?.singleFilePath,
      })
    } else {
      results = await this.search(query, {
        prefixLength: 1,
        singleFilePath: options?.singleFilePath,
      })
    }

    const documents = await Promise.all(
      results.map(async result => await cacheManager.getDocument(result.id))
    )

    // Map the raw results to get usable suggestions
    const resultNotes = results.map(result => {
      logDebug('Locating matches for', result.id)
      let note = documents.find(d => d.path === result.id)
      if (!note) {
        // throw new Error(`Omnisearch - Note "${result.id}" not indexed`)
        console.warn(`Omnisearch - Note "${result.id}" not in the live cache`)
        note = {
          content: '',
          basename: result.id,
          path: result.id,
        } as IndexedDocument
      }

      // Clean search matches that match quoted expressions,
      // and inject those expressions instead
      const foundWords = [
        // Matching terms from the result,
        // do not necessarily match the query
        ...result.terms,

        // Quoted expressions
        ...query.getExactTerms(),

        // Tags, starting with #
        ...query.getTags(),
      ]
      logDebug('Matching tokens:', foundWords)

      logDebug('Getting matches locations...')
      const matches = getMatches(
        note.content,
        stringsToRegex(foundWords),
        query
      )
      logDebug(`Matches for ${note.basename}`, matches)
      const resultNote: ResultNote = {
        score: result.score,
        foundWords,
        matches,
        ...note,
      }
      return resultNote
    })
    return resultNotes
  }

  public async writeToCache(): Promise<void> {
    await cacheManager.writeMinisearchCache(
      this.minisearch,
      this.indexedDocuments
    )
  }
}

