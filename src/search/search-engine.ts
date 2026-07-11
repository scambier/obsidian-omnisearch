import MiniSearch, {
  type AsPlainObject,
  type Options,
  type QueryCombination,
  type SearchOptions,
  type SearchResult,
} from 'minisearch'
import {
  RecencyCutoff,
  type DocumentRef,
  type IndexedDocument,
  type ResultNote,
} from '../globals'

import {
  chunkArray,
  countError,
  logVerbose,
  removeDiacritics,
} from '../tools/utils'
import { Notice } from 'obsidian'
import type { Query } from './query'
import { sortBy } from 'es-toolkit/compat'
import type OmnisearchPlugin from '../main'
import { Tokenizer } from './tokenizer'
import {
  HAN_GRAM_FIELD_BY_SOURCE,
  HAN_GRAM_FIELDS,
  ORIGINAL_SEARCH_FIELDS,
  documentContainsHanRuns,
  getSourceFieldForHanGram,
  isHanGramField,
  reconcileVerifiedHanResults,
  requiresHanVerification,
} from './han-grams'

type SearchResultWithHan = SearchResult & { hanQueryRuns?: string[] }

export class SearchEngine {
  private tokenizer: Tokenizer
  private minisearch: MiniSearch
  /** Map<path, mtime> */
  private indexedDocuments: Map<string, number> = new Map()

  // private previousResults: SearchResult[] = []
  // private previousQuery: Query | null = null

  constructor(protected plugin: OmnisearchPlugin) {
    this.tokenizer = new Tokenizer(plugin)
    this.minisearch = new MiniSearch(this.getOptions())
  }

  /**
   * Return true if the cache is valid
   */
  async loadCache(): Promise<boolean> {
    await this.plugin.embedsRepository.loadFromCache()
    const cache = await this.plugin.database.getMinisearchCache()
    if (cache) {
      if (cache.indexSignature !== this.getIndexSignature()) {
        logVerbose('Search cache index signature changed')
        return false
      }
      this.minisearch = await MiniSearch.loadJSAsync(
        cache.data,
        this.getOptions()
      )
      this.indexedDocuments = new Map(cache.paths.map(o => [o.path, o.mtime]))
      return true
    }
    console.log('Omnisearch - No cache found')
    return false
  }

  /**
   * Returns the list of documents that need to be reindexed or removed,
   * either because they are new, have been modified, or have been deleted
   * @param docs
   */
  getDocumentsToReindex(docs: DocumentRef[]): {
    toAdd: DocumentRef[]
    toRemove: DocumentRef[]
  } {
    const docsMap = new Map(docs.map(d => [d.path, d.mtime]))

    const toAdd = docs.filter(
      d =>
        !this.indexedDocuments.has(d.path) ||
        this.indexedDocuments.get(d.path) !== d.mtime
    )

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
    logVerbose('Adding files', paths)
    let documents = (
      await Promise.all(
        paths.map(
          async path => await this.plugin.documentsRepository.getDocument(path)
        )
      )
    ).filter(d => !!d?.path)
    logVerbose('Sorting documents to first index markdown')
    // Index markdown files first
    documents = sortBy(documents, d => (d.path.endsWith('.md') ? 0 : 1))

    // If a document is already added, discard it
    this.removeFromPaths(
      documents.filter(d => this.indexedDocuments.has(d.path)).map(d => d.path)
    )

    // Split the documents in smaller chunks to add them to minisearch
    const chunkedDocs = chunkArray(documents, 500)
    for (const docs of chunkedDocs) {
      logVerbose('Indexing into search engine', docs)
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
    options: {
      prefixLength: number
      singleFilePath?: string
      signal?: AbortSignal
    }
  ): Promise<SearchResult[]> {
    const settings = this.plugin.settings
    if (query.isEmpty() || options.signal?.aborted) {
      // this.previousResults = []
      // this.previousQuery = null
      return []
    }

    logVerbose('=== New search ===')
    logVerbose('Starting search for', query)

    let fuzziness: number
    switch (settings.fuzziness) {
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

    const naturalQuery = this.tokenizer.tokenizeForSearch(query.segmentsToStr())
    const hanSearch = this.tokenizer.tokenizeForHanSearch(
      query.segmentsToStr(),
      () => query.rawSegmentsToStr()
    )
    logVerbose(JSON.stringify(naturalQuery, null, 1))
    if (hanSearch) logVerbose(JSON.stringify(hanSearch.query, null, 1))

    const miniSearchOptions: SearchOptions = {
      fields: [...ORIGINAL_SEARCH_FIELDS],
      prefix: term => term.length >= options.prefixLength,
      // length <= 3: no fuzziness
      // length <= 5: fuzziness of 10%
      // length > 5: fuzziness of 20%
      fuzzy: term =>
        term.length <= 3 ? 0 : term.length <= 5 ? fuzziness / 2 : fuzziness,
      boost: {
        basename: settings.weightBasename,
        aliases: settings.weightBasename,
        displayTitle: settings.weightBasename,
        directory: settings.weightDirectory,
        headings1: settings.weightH1,
        headings2: settings.weightH2,
        headings3: settings.weightH3,
        tags: settings.weightUnmarkedTags,
        unmarkedTags: settings.weightUnmarkedTags,
        [HAN_GRAM_FIELD_BY_SOURCE.basename]: settings.weightBasename,
        [HAN_GRAM_FIELD_BY_SOURCE.directory]: settings.weightDirectory,
        [HAN_GRAM_FIELD_BY_SOURCE.aliases]: settings.weightBasename,
        [HAN_GRAM_FIELD_BY_SOURCE.content]: 1,
        [HAN_GRAM_FIELD_BY_SOURCE.headings1]: settings.weightH1,
        [HAN_GRAM_FIELD_BY_SOURCE.headings2]: settings.weightH2,
        [HAN_GRAM_FIELD_BY_SOURCE.headings3]: settings.weightH3,
      },
      // The query is already tokenized, don't tokenize again
      tokenize: text => [text],
      boostDocument(_id, _term, storedFields) {
        if (
          !storedFields?.mtime ||
          settings.recencyBoost === RecencyCutoff.Disabled
        ) {
          return 1
        }
        const mtime = storedFields?.mtime as number
        const now = new Date().valueOf()
        console.log(now)
        const daysElapsed = (now - mtime) / (24 * 3600_000)

        // Documents boost
        const cutoff = {
          [RecencyCutoff.Day]: -3,
          [RecencyCutoff.Week]: -0.3,
          [RecencyCutoff.Month]: -0.1,
        } as const
        return (
          1 + Math.exp(cutoff[settings.recencyBoost] * (daysElapsed / 1000))
        )
      },
    }

    let results = hanSearch
      ? await this.searchWithHanFallback(
          naturalQuery,
          hanSearch,
          query,
          options.singleFilePath,
          options.signal,
          miniSearchOptions
        )
      : this.minisearch.search(naturalQuery, miniSearchOptions)

    if (options.signal?.aborted) return []

    logVerbose(`Found ${results.length} results`, results)

    results = this.filterByQueryPath(results, query)

    if (!results.length) {
      return []
    }

    if (options.singleFilePath) {
      return this.filterByDocumentSemantics(
        results.filter(r => r.id === options.singleFilePath),
        query,
        options.signal
      )
    }

    logVerbose(
      'searching with downranked folders',
      settings.downrankedFoldersFilters
    )

    // Hide or downrank files that are in Obsidian's excluded list
    if (settings.hideExcluded) {
      // Filter the files out
      results = results.filter(
        result =>
          !(
            this.plugin.app.metadataCache.isUserIgnored &&
            this.plugin.app.metadataCache.isUserIgnored(result.id)
          )
      )
    } else {
      // Just downrank them
      results.forEach(result => {
        if (
          this.plugin.app.metadataCache.isUserIgnored &&
          this.plugin.app.metadataCache.isUserIgnored(result.id)
        ) {
          result.score /= 10
        }
      })
    }

    // Extract tags from the query
    const tags = query.getTags()

    for (const result of results) {
      const path = result.id
      if (settings.downrankedFoldersFilters.length > 0) {
        // downrank files that are in folders listed in the downrankedFoldersFilters
        let downrankingFolder = false
        settings.downrankedFoldersFilters.forEach(filter => {
          if (path.startsWith(filter)) {
            // we don't want the filter to match the folder sources, e.g.
            // it needs to match a whole folder name
            if (path === filter || path.startsWith(filter + '/')) {
              logVerbose('searching with downranked folders in path: ', path)
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
          if (settings.downrankedFoldersFilters.includes(pathPart)) {
            result.score /= 10
            break
          }
        }
      }

      const metadata = this.plugin.app.metadataCache.getCache(path)
      if (metadata) {
        // Boost custom properties
        for (const { name, weight } of settings.weightCustomProperties) {
          const values = metadata?.frontmatter?.[name]
          if (values && result.terms.some(t => values.includes(t))) {
            logVerbose(`Boosting field "${name}" x${weight} for ${path}`)
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
    logVerbose('Sorting and limiting results')

    // Sort results and keep the 50 best
    results = results.sort((a, b) => b.score - a.score).slice(0, 50)

    logVerbose('Filtered results:', results)

    if (results.length) logVerbose('First result:', results[0])

    results = await this.filterByDocumentSemantics(
      results,
      query,
      options.signal
    )

    logVerbose('Deduping')
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
    options?: { singleFilePath?: string; signal?: AbortSignal }
  ): Promise<ResultNote[]> {
    // Get the raw results
    let results: SearchResult[]
    if (this.plugin.settings.simpleSearch) {
      results = await this.search(query, {
        prefixLength: 3,
        singleFilePath: options?.singleFilePath,
        signal: options?.signal,
      })
    } else {
      results = await this.search(query, {
        prefixLength: 1,
        singleFilePath: options?.singleFilePath,
        signal: options?.signal,
      })
    }

    if (options?.signal?.aborted) return []

    const documents = await Promise.all(
      results.map(
        async result =>
          await this.plugin.documentsRepository.getDocument(result.id)
      )
    )
    if (options?.signal?.aborted) return []

    // Inject embeds for images, documents, and PDFs
    let total = documents.length
    for (let i = 0; i < total; i++) {
      if (options?.signal?.aborted) return []
      const doc = documents[i]
      if (!doc) continue

      const embeds = this.plugin.embedsRepository
        .getEmbeds(doc.path)
        .slice(0, this.plugin.settings.maxEmbeds)

      // Inject embeds in the results
      for (const embed of embeds) {
        if (options?.signal?.aborted) return []
        total++
        const newDoc = await this.plugin.documentsRepository.getDocument(embed)
        if (options?.signal?.aborted) return []
        documents.splice(i + 1, 0, newDoc)
        results.splice(i + 1, 0, {
          id: newDoc.path,
          score: 0,
          terms: [],
          queryTerms: [],
          match: {},
          isEmbed: true,
        })
        i++ // Increment i to skip the newly inserted document
      }
    }

    // Map the raw results to get usable suggestions
    const resultNotes = results.map(result => {
      logVerbose('Locating matches for', result.id)
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
      const hanQueryRuns = (result as SearchResultWithHan).hanQueryRuns ?? []
      const naturalTerms = result.terms.filter(
        term => !result.match[term]?.some(field => isHanGramField(field))
      )
      const foundWords = [
        ...new Set([
          // Use the original query run for fallback excerpts/highlights.
          ...hanQueryRuns,

          // Matching terms from the result,
          // do not necessarily match the query
          ...naturalTerms,

          // Quoted expressions
          ...query.getExactTerms(),

          // Tags, starting with #
          ...query.getTags(),
        ]),
      ]
      logVerbose('Matching tokens:', foundWords)

      logVerbose('Getting matches locations...')
      const matches = this.plugin.textProcessor.getMatches(
        note.content,
        foundWords,
        query
      )
      logVerbose(`Matches for note "${note.path}"`, matches)
      const resultNote: ResultNote = {
        score: result.score,
        foundWords,
        matches,
        isEmbed: result.isEmbed,
        ...note,
      }
      return resultNote
    })

    logVerbose('Suggestions:', resultNotes)

    return resultNotes
  }

  /**
   * For cache saving
   */
  public getSerializedMiniSearch(): AsPlainObject {
    return this.minisearch.toJSON()
  }

  /**
   * For cache saving
   */
  public getSerializedIndexedDocuments(): { path: string; mtime: number }[] {
    return Array.from(this.indexedDocuments).map(([path, mtime]) => ({
      path,
      mtime,
    }))
  }

  public getIndexSignature(): string {
    return this.tokenizer.getIndexSignature()
  }

  private getOptions(): Options<IndexedDocument> {
    return {
      tokenize: this.tokenizer.tokenizeForIndexing.bind(this.tokenizer),
      extractField: (doc, fieldName) =>
        this.extractDocumentField(doc, fieldName),
      processTerm: (term: string, fieldName?: string) =>
        (fieldName && isHanGramField(fieldName)
          ? term
          : this.plugin.settings.ignoreDiacritics
            ? removeDiacritics(
                term,
                this.plugin.settings.ignoreArabicDiacritics
              )
            : term
        ).toLowerCase(),
      idField: 'path',
      fields: [...ORIGINAL_SEARCH_FIELDS, ...HAN_GRAM_FIELDS],
      storeFields: ['tags', 'mtime'],
      logger(_level, _message, code) {
        if (code === 'version_conflict') {
          new Notice(
            'Omnisearch - Your index cache may be incorrect or corrupted. If this message keeps appearing, go to Settings to clear the cache.',
            5000
          )
        }
      },
    }
  }

  private extractDocumentField(
    document: IndexedDocument,
    fieldName: string
  ): string {
    // MiniSearch's extractField type says string, but stored fields retain their
    // original runtime values and are not sent through the tokenizer.
    if (fieldName === 'tags') return document.tags as unknown as string
    if (fieldName === 'mtime') return document.mtime as unknown as string

    const sourceField = isHanGramField(fieldName)
      ? getSourceFieldForHanGram(fieldName)
      : fieldName
    if (sourceField === 'directory') {
      const parts = document.path.split('/')
      parts.pop()
      return parts.join('/')
    }
    const value = document[sourceField as keyof IndexedDocument]
    return Array.isArray(value) ? value.join(' ') : String(value ?? '')
  }

  private async filterByDocumentSemantics(
    results: SearchResult[],
    query: Query,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    const documents = await Promise.all(
      results.map(async result => {
        const document = await this.plugin.documentsRepository.getDocument(
          result.id
        )
        if (!document) {
          console.warn(`Omnisearch - Note "${result.id}" not in the live cache`)
          countError(true)
        }
        return document
      })
    )
    if (signal?.aborted) return []

    const exactTerms = query.getExactTerms()
    if (exactTerms.length) {
      logVerbose('Filtering with quoted terms: ', exactTerms)
      results = results.filter(result => {
        const document = documents.find(item => item.path === result.id)
        const title = document?.path.toLowerCase() ?? ''
        const content = (document?.cleanedContent ?? '').toLowerCase()
        return exactTerms.every(
          term =>
            content.includes(term) ||
            removeDiacritics(
              title,
              this.plugin.settings.ignoreArabicDiacritics
            ).includes(term)
        )
      })
    }

    const exclusions = query.query.exclude.text
    if (exclusions.length) {
      logVerbose('Filtering with exclusions')
      results = results.filter(result => {
        const content = (
          documents.find(item => item.path === result.id)?.content ?? ''
        ).toLowerCase()
        return exclusions.every(term => !content.includes(term))
      })
    }

    return results
  }

  private filterByQueryPath<T extends SearchResult>(
    results: T[],
    query: Query
  ): T[] {
    if (query.query.ext?.length) {
      results = results.filter(result => {
        const ext = '.' + String(result.id).split('.').pop()
        return query.query.ext?.some(value =>
          ext.startsWith(value.startsWith('.') ? value : '.' + value)
        )
      })
    }
    if (query.query.path) {
      results = results.filter(result =>
        query.query.path?.some(path =>
          String(result.id).toLowerCase().includes(path.toLowerCase())
        )
      )
    }
    if (query.query.exclude.path) {
      results = results.filter(
        result =>
          !query.query.exclude.path?.some(path =>
            String(result.id).toLowerCase().includes(path.toLowerCase())
          )
      )
    }
    return results
  }

  private async searchWithHanFallback(
    naturalQuery: QueryCombination,
    hanSearch: { query: QueryCombination; runs: string[] },
    query: Query,
    singleFilePath: string | undefined,
    signal: AbortSignal | undefined,
    miniSearchOptions: SearchOptions
  ): Promise<SearchResultWithHan[]> {
    const combinedQuery: QueryCombination = {
      combineWith: 'OR',
      queries: [naturalQuery, hanSearch.query],
    }
    if (!requiresHanVerification(hanSearch.runs)) {
      return this.markHanResults(
        this.minisearch.search(combinedQuery, miniSearchOptions),
        hanSearch.runs
      )
    }

    const naturalResults = this.minisearch.search(
      naturalQuery,
      miniSearchOptions
    )
    let fallbackCandidates = this.filterByQueryPath(
      this.minisearch.search(hanSearch.query, miniSearchOptions),
      query
    )
    if (singleFilePath) {
      fallbackCandidates = fallbackCandidates.filter(
        result => result.id === singleFilePath
      )
    }
    const verifiedFallbackIds = await this.verifyHanCandidates(
      fallbackCandidates,
      hanSearch.runs,
      signal
    )
    if (!verifiedFallbackIds) return []
    const combinedResults = this.minisearch.search(
      combinedQuery,
      miniSearchOptions
    )
    return this.markHanResults(
      reconcileVerifiedHanResults(
        naturalResults,
        combinedResults,
        verifiedFallbackIds
      ),
      hanSearch.runs
    )
  }

  private async verifyHanCandidates(
    results: SearchResult[],
    runs: string[],
    signal?: AbortSignal
  ): Promise<Set<string> | null> {
    const verified = new Set<string>()
    for (const chunk of chunkArray(results, 50)) {
      if (signal?.aborted) return null
      const documents = await Promise.all(
        chunk.map(result =>
          this.plugin.documentsRepository.getDocument(String(result.id))
        )
      )
      documents.forEach((document, index) => {
        if (!document) return
        const fieldValues = ORIGINAL_SEARCH_FIELDS.map(field =>
          String(this.extractDocumentField(document, field) ?? '')
        )
        if (documentContainsHanRuns(runs, fieldValues)) {
          verified.add(String(chunk[index].id))
        }
      })
      if (signal?.aborted) return null
    }
    return verified
  }

  private markHanResults(
    results: SearchResultWithHan[],
    runs: string[]
  ): SearchResultWithHan[] {
    results.forEach(result => {
      if (
        Object.values(result.match).some(fields => fields.some(isHanGramField))
      ) {
        result.hanQueryRuns = runs
      }
    })
    return results
  }
}
