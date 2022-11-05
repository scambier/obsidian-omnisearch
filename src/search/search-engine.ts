import MiniSearch, { type Options, type SearchResult } from 'minisearch'
import {
  chsRegex,
  type IndexedDocument,
  type ResultNote,
  type SearchMatch,
  SPACE_OR_PUNCTUATION,
} from '../globals'
import {
  removeDiacritics,
  stringsToRegex,
  stripMarkdownCharacters,
} from '../tools/utils'
import type { Query } from './query'
import { settings } from '../settings'
import { cacheManager } from '../cache-manager'
import { writable } from 'svelte/store'
import { Notice } from 'obsidian'

const tokenize = (text: string): string[] => {
  const tokens = text.split(SPACE_OR_PUNCTUATION)
  const chsSegmenter = (app as any).plugins.plugins['cm-chs-patch']

  if (chsSegmenter) {
    return tokens.flatMap(word =>
      chsRegex.test(word) ? chsSegmenter.cut(word) : [word]
    )
  } else return tokens
}

export const minisearchOptions: Options<IndexedDocument> = {
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
  callbackWhenDesync() {
    new Notice(
      'Omnisearch - Your index cache may be incorrect or corrupted. If this message keeps appearing, go to Settings to clear the cache.'
    )
  },
}

export class SearchEngine {
  private static engine?: SearchEngine
  public static isIndexing = writable(true)

  /**
   * The main singleton SearchEngine instance.
   * Should be used for all queries
   */
  public static getEngine(): SearchEngine {
    if (!this.engine) {
      this.engine = new SearchEngine()
    }
    return this.engine
  }

  /**
   * Instantiates the main instance with cache data (if it exists)
   */
  public static async initFromCache(): Promise<SearchEngine> {
    try {
      const cache = await cacheManager.getMinisearchCache()
      if (cache) {
        this.getEngine().minisearch = cache
      }
    } catch (e) {
      new Notice(
        'Omnisearch - Cache missing or invalid. Some freezes may occur while Omnisearch indexes your vault.'
      )
      console.error('Omnisearch - Could not init engine from cache')
      console.error(e)
    }
    return this.getEngine()
  }

  private minisearch: MiniSearch

  private constructor() {
    this.minisearch = new MiniSearch(minisearchOptions)
  }

  /**
   * Searches the index for the given query,
   * and returns an array of raw results
   */
  public async search(
    query: Query,
    options = { fuzzy: 0.1, prefix: false }
  ): Promise<SearchResult[]> {
    if (!query.segmentsToStr()) return []

    let results = this.minisearch.search(query.segmentsToStr(), {
      prefix: term => {
        return options.prefix || term.length > 4
      },
      fuzzy: options.fuzzy,
      combineWith: 'AND',
      boost: {
        basename: settings.weightBasename,
        aliases: settings.weightBasename,
        headings1: settings.weightH1,
        headings2: settings.weightH2,
        headings3: settings.weightH3,
      },
    })

    // Downrank files that are in Obsidian's excluded list
    if (settings.respectExcluded) {
      results.forEach(result => {
        if (
          app.metadataCache.isUserIgnored &&
          app.metadataCache.isUserIgnored(result.id)
        ) {
          result.score /= 10 // TODO: make this value configurable or toggleable?
        }
      })
    }

    // If the search query contains quotes, filter out results that don't have the exact match
    const exactTerms = query.getExactTerms()
    if (exactTerms.length) {
      results = results.filter(r => {
        const title =
          cacheManager.getLiveDocument(r.id)?.path.toLowerCase() ?? ''
        const content = stripMarkdownCharacters(
          cacheManager.getLiveDocument(r.id)?.content ?? ''
        ).toLowerCase()
        return exactTerms.every(q => content.includes(q) || title.includes(q))
      })
    }

    // If the search query contains exclude terms, filter out results that have them
    const exclusions = query.exclusions
    if (exclusions.length) {
      results = results.filter(r => {
        const content = stripMarkdownCharacters(
          cacheManager.getLiveDocument(r.id)?.content ?? ''
        ).toLowerCase()
        return exclusions.every(q => !content.includes(q.value))
      })
    }
    return results
  }

  /**
   * Parses a text against a regex, and returns the { string, offset } matches
   */
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
    let results = await this.search(query)
    if (results.length == 0) {
      if (settings.retryWhenZeroResult) {
        results = await this.search(query, { fuzzy: 0.2, prefix: true })
      }
    }
    if (!results.length) return []

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

    // Map the raw results to get usable suggestions
    return results.map(result => {
      let note = cacheManager.getLiveDocument(result.id)
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
  }

  // #region Read/write minisearch index

  public async addAllToMinisearch(
    documents: IndexedDocument[],
    chunkSize = 10
  ): Promise<void> {
    await this.minisearch.addAllAsync(documents, { chunkSize })
  }

  public addSingleToMinisearch(document: IndexedDocument): void {
    this.minisearch.add(document)
  }

  public removeFromMinisearch(document: IndexedDocument): void {
    this.minisearch.remove(document)
  }

  // #endregion

  public async writeToCache(documents: IndexedDocument[]): Promise<void> {
    await cacheManager.writeMinisearchCache(this.minisearch, documents)
  }
}
