import MiniSearch, {
  type AsPlainObject,
  type Options,
  type SearchResult,
} from 'minisearch'
import type { IndexedDocument, ResultNote, SearchMatch } from '../globals'
import { chsRegex, SPACE_OR_PUNCTUATION } from '../globals'
import { settings } from '../settings'
import {
  removeDiacritics,
  stringsToRegex,
  stripMarkdownCharacters,
} from '../tools/utils'
import { Notice } from 'obsidian'
import { getIndexedDocument } from '../file-loader'
import type { Query } from './query'
import { cacheManager } from '../cache-manager'

const tokenize = (text: string): string[] => {
  const tokens = text.split(SPACE_OR_PUNCTUATION)
  const chsSegmenter = (app as any).plugins.plugins['cm-chs-patch']

  if (chsSegmenter) {
    return tokens.flatMap(word =>
      chsRegex.test(word) ? chsSegmenter.cut(word) : [word]
    )
  } else return tokens
}

export class Omnisearch {
  public static readonly options: Options<IndexedDocument> = {
    tokenize,
    processTerm: (term: string) =>
      (settings.ignoreDiacritics ? removeDiacritics(term) : term).toLowerCase(),
    idField: 'path',
    fields: [
      'basename',
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
          'Omnisearch - Your index cache may be incorrect or corrupted. If this message keeps appearing, go to Settings to clear the cache.'
        )
      }
    },
  }
  private minisearch: MiniSearch
  private indexedDocuments: Map<string, number> = new Map()
  private previousResults: SearchResult[] = []

  constructor() {
    this.minisearch = new MiniSearch(Omnisearch.options)
  }

  async loadCache(): Promise<void> {
    const cache = await cacheManager.getMinisearchCache()
    if (cache) {
      this.minisearch = MiniSearch.loadJS(cache.data, Omnisearch.options)
      this.indexedDocuments = new Map(cache.paths.map(o => [o.path, o.mtime]))
    }
  }

  /**
   * Add notes/PDFs/images to the search index
   * @param paths
   */
  public async addFromPaths(paths: string[]): Promise<void> {
    let documents = await Promise.all(
      paths.map(async path => await getIndexedDocument(path))
    )

    // If a document is already added, discard it
    this.removeFromPaths(
      documents.filter(d => this.indexedDocuments.has(d.path)).map(d => d.path)
    )

    documents.forEach(doc => this.indexedDocuments.set(doc.path, doc.mtime))
    await this.minisearch.addAllAsync(documents)
  }

  /**
   * Discard a document from minisearch
   * @param paths
   */
  public removeFromPaths(paths: string[]): void {
    paths.forEach(p => this.indexedDocuments.delete(p))
    this.minisearch.discardAll(paths)
  }

  /**
   * Searches the index for the given query,
   * and returns an array of raw results
   */
  public async search(
    query: Query,
    options: { prefixLength: number }
  ): Promise<SearchResult[]> {
    if (query.isEmpty()) {
      this.previousResults = []
      return []
    }

    let results = this.minisearch.search(query.segmentsToStr(), {
      prefix: term => term.length >= options.prefixLength,
      fuzzy: 0.2,
      combineWith: 'AND',
      boost: {
        basename: settings.weightBasename,
        aliases: settings.weightBasename,
        headings1: settings.weightH1,
        headings2: settings.weightH2,
        headings3: settings.weightH3,
      },
    })
    if (!results.length) return this.previousResults

    // Downrank files that are in Obsidian's excluded list
    if (settings.respectExcluded) {
      results.forEach(result => {
        if (
          app.metadataCache.isUserIgnored &&
          app.metadataCache.isUserIgnored(result.id)
        ) {
          result.score /= 10
        }
      })
    }

    const documents = await Promise.all(
      results.map(async result => await getIndexedDocument(result.id))
    )

    // If the search query contains quotes, filter out results that don't have the exact match
    const exactTerms = query.getExactTerms()
    if (exactTerms.length) {
      results = results.filter(r => {
        const document = documents.find(d => d.path === r.id)
        const title = document?.path.toLowerCase() ?? ''
        const content = stripMarkdownCharacters(
          document?.content ?? ''
        ).toLowerCase()
        return exactTerms.every(q => content.includes(q) || title.includes(q))
      })
    }

    // If the search query contains exclude terms, filter out results that have them
    const exclusions = query.exclusions
    if (exclusions.length) {
      results = results.filter(r => {
        const content = stripMarkdownCharacters(
          documents.find(d => d.path === r.id)?.content ?? ''
        ).toLowerCase()
        return exclusions.every(q => !content.includes(q.value))
      })
    }
    // FIXME:
    // Dedupe results - clutch for https://github.com/scambier/obsidian-omnisearch/issues/129
    results = results
      .filter(
        (result, index, arr) => arr.findIndex(t => t.id === result.id) === index
      )
      .slice(0, 50)

    this.previousResults = results

    return results
  }

  public getMatches(text: string, reg: RegExp, query: Query): SearchMatch[] {
    let match: RegExpExecArray | null = null
    const matches: SearchMatch[] = []
    let count = 0
    while ((match = reg.exec(text)) !== null) {
      if (++count >= 100) break // Avoid infinite loops, stop looking after 100 matches
      const m = match[0]
      if (m) matches.push({ match: m, offset: match.index })
    }

    // If the query can be found "as is" in the text, put this match first
    const best = text.toLowerCase().indexOf(query.segmentsToStr())
    if (best > -1) {
      matches.unshift({
        offset: best,
        match: query.segmentsToStr(),
      })
    }

    return matches
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
    options?: Partial<{ singleFilePath: string | null }>
  ): Promise<ResultNote[]> {
    // Get the raw results
    let results: SearchResult[]
    if (settings.simpleSearch) {
      results = await this.search(query, { prefixLength: 1 })
    } else {
      results = await this.search(query, { prefixLength: 3 })
    }

    // Extract tags from the query
    const tags = query.segments
      .filter(s => s.value.startsWith('#'))
      .map(s => s.value)

    // Either keep the 50 first results,
    // or the one corresponding to `singleFile`
    if (options?.singleFilePath) {
      const result = results.find(r => r.id === options.singleFilePath)
      if (result) results = [result]
      else results = []
    } else {
      results = results.slice(0, 50)

      // Put the results with tags on top
      for (const tag of tags) {
        for (const result of results) {
          if ((result.tags ?? []).includes(tag)) {
            result.score *= 100
          }
        }
      }
    }

    // TODO: this already called in search(), pass each document in its SearchResult instead?
    const documents = await Promise.all(
      results.map(async result => await getIndexedDocument(result.id))
    )

    // Map the raw results to get usable suggestions
    const resultNotes = results.map(result => {
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

      // Remove '#' from tags, for highlighting
      query.segments.forEach(s => {
        s.value = s.value.replace(/^#/, '')
      })
      // Clean search matches that match quoted expressions,
      // and inject those expressions instead
      const foundWords = [
        // Matching terms from the result,
        // do not necessarily match the query
        ...Object.keys(result.match),

        // Quoted expressions
        ...query.segments.filter(s => s.exact).map(s => s.value),

        // Tags, starting with #
        ...tags,
      ].filter(w => w.length > 1)

      // console.log(foundWords)
      const matches = this.getMatches(
        note.content,
        stringsToRegex(foundWords),
        query
      )
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

export const searchEngine = new Omnisearch()
