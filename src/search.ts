import { Notice, TFile, type TAbstractFile } from 'obsidian'
import MiniSearch, { type SearchResult } from 'minisearch'
import {
  SPACE_OR_PUNCTUATION,
  type IndexedNote,
  type ResultNote,
  type SearchMatch,
} from './globals'
import {
  extractHeadingsFromCache,
  stringsToRegex,
  stripMarkdownCharacters,
  wait,
} from './utils'
import type { Query } from './query'

let minisearchInstance: MiniSearch<IndexedNote>
let indexedNotes: Record<string, IndexedNote> = {}

/**
 * Initializes the MiniSearch instance,
 * and adds all the notes to the index
 */
export async function initGlobalSearchIndex(): Promise<void> {
  indexedNotes = {}
  minisearchInstance = new MiniSearch({
    tokenize: text => text.split(SPACE_OR_PUNCTUATION),
    idField: 'path',
    fields: ['basename', 'content', 'headings1', 'headings2', 'headings3'],
  })

  // Index files that are already present
  const start = new Date().getTime()
  const files = app.vault.getMarkdownFiles()

  // This is basically the same behavior as MiniSearch's `addAllAsync()`.
  // We index files by batches of 10
  if (files.length) {
    console.log('Omnisearch - indexing ' + files.length + ' files')
  }
  for (let i = 0; i < files.length; ++i) {
    if (i % 10 === 0) await wait(0)
    const file = files[i]
    if (file) await addToIndex(file)
  }

  if (files.length > 0) {
    new Notice(
      `Omnisearch - Indexed ${files.length} notes in ${
        new Date().getTime() - start
      }ms`,
    )
  }

  // Listen to the query input to trigger a search
  // subscribeToQuery()
}

/**
 * Searches the index for the given query,
 * and returns an array of raw results
 * @param text
 * @returns
 */
async function search(query: Query): Promise<SearchResult[]> {
  if (!query.segmentsToStr()) return []
  let results = minisearchInstance.search(query.segmentsToStr(), {
    prefix: true,
    fuzzy: term => (term.length > 4 ? 0.2 : false),
    combineWith: 'AND',
    boost: {
      basename: 2,
      headings1: 1.5,
      headings2: 1.3,
      headings3: 1.1,
    },
  })

  // Half the score for files that are in Obsidian's excluded list
  results.forEach(result => {
    if (app.metadataCache.isUserIgnored(result.id)) {
      result.score /= 3 // TODO: make this value configurable or toggleable?
    }
  })

  // If the search query contains quotes, filter out results that don't have the exact match
  const exactTerms = query.getExactTerms()
  if (exactTerms.length) {
    results = results.filter(r => {
      const content = stripMarkdownCharacters(
        indexedNotes[r.id]?.content ?? '',
      ).toLowerCase()
      return exactTerms.every(q => content.includes(q))
    })
  }

  // // If the search query contains exclude terms, filter out results that have them
  const exclusions = query.exclusions
  if (exclusions.length) {
    results = results.filter(r => {
      const content = stripMarkdownCharacters(
        indexedNotes[r.id]?.content ?? '',
      ).toLowerCase()
      return exclusions.every(q => !content.includes(q.value))
    })
  }
  return results
}

/**
 * Parses a text against a regex, and returns the { string, offset } matches
 * @param text
 * @param reg
 * @returns
 */
export function getMatches(text: string, reg: RegExp): SearchMatch[] {
  let match: RegExpExecArray | null = null
  const matches: SearchMatch[] = []
  while ((match = reg.exec(text)) !== null) {
    const m = match[0]
    if (m) matches.push({ match: m, offset: match.index })
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
export async function getSuggestions(
  query: Query,
  options?: Partial<{ singleFilePath: string | null }>,
): Promise<ResultNote[]> {
  // Get the raw results
  let results = await search(query)
  if (!results.length) return []

  // Either keep the 50 first results,
  // or the one corresponding to `singleFile`
  if (options?.singleFilePath) {
    const result = results.find(r => r.id === options.singleFilePath)
    if (result) results = [result]
    else results = []
  }
  else {
    results = results.sort((a, b) => b.score - a.score).slice(0, 50)
  }

  // Map the raw results to get usable suggestions
  const suggestions = results.map(result => {
    const note = indexedNotes[result.id]
    if (!note) {
      throw new Error(`Note "${result.id}" not indexed`)
    }

    // Clean search matches that match quoted expressions,
    // and inject those expressions instead
    const foundWords = [
      ...Object.keys(result.match).filter(w =>
        query.segments.some(s => w.startsWith(s.value)),
      ),
      ...query.segments.filter(s => s.exact).map(s => s.value),
    ]
    const matches = getMatches(note.content, stringsToRegex(foundWords))
    const resultNote: ResultNote = {
      score: result.score,
      foundWords,
      matches,
      ...note,
    }
    return resultNote
  })

  return suggestions
}

/**
 * Adds a file to the index
 * @param file
 * @returns
 */
export async function addToIndex(file: TAbstractFile): Promise<void> {
  if (!(file instanceof TFile) || file.extension !== 'md') {
    return
  }
  try {
    // console.log(`Omnisearch - adding ${file.path} to index`)
    const fileCache = app.metadataCache.getFileCache(file)

    if (indexedNotes[file.path]) {
      throw new Error(`${file.basename} is already indexed`)
    }

    // Fetch content from the cache to index it as-is
    const content = await app.vault.cachedRead(file)

    // Make the document and index it
    const note: IndexedNote = {
      basename: file.basename,
      content,
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
    minisearchInstance.add(note)
    indexedNotes[note.path] = note
  }
  catch (e) {
    console.trace('Error while indexing ' + file.basename)
    console.error(e)
  }
}

/**
 * Removes a file from the index
 * @param file
 * @returns
 */
export function removeFromIndex(file: TAbstractFile): void {
  if (file instanceof TFile && file.path.endsWith('.md')) {
    // console.log(`Omnisearch - removing ${file.path} from index`)
    return removeFromIndexByPath(file.path)
  }
}

/**
 * Removes a file from the index, by its path
 * @param path
 */
export function removeFromIndexByPath(path: string): void {
  const note = indexedNotes[path]
  if (note) {
    minisearchInstance.remove(note)
    delete indexedNotes[path]
  }
}
