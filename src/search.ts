import { Notice, TFile, type TAbstractFile } from 'obsidian'
import MiniSearch, { type SearchResult } from 'minisearch'
import type { IndexedNote, ResultNote, SearchMatch } from './globals'
import {
  indexedNotes,
  inFileSearch as singleFileSearch,
  plugin,
  resultNotes,
  searchQuery,
  selectedNote,
} from './stores'
import { get } from 'svelte/store'
import { extractHeadingsFromCache, stringsToRegex, wait } from './utils'
import { tick } from 'svelte'

let minisearchInstance: MiniSearch<IndexedNote>

/**
 * Initializes the MiniSearch instance,
 * and adds all the notes to the index
 */
export async function initGlobalSearchIndex(): Promise<void> {
  indexedNotes.set({})
  minisearchInstance = new MiniSearch({
    idField: 'path',
    fields: ['basename', 'content', 'headings1', 'headings2', 'headings3'],
  })

  // Index files that are already present
  const start = new Date().getTime()
  const files = get(plugin).app.vault.getMarkdownFiles()

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
  subscribeToQuery()
}

/**
 * Searches the index for the given query,
 * and returns an array of raw results
 * @param query
 * @returns
 */
function search(query: string): SearchResult[] {
  if (!query) return []
  return minisearchInstance.search(query, {
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
}

/**
 * Automatically re-trigger the search when the query or the
 * inFileSearch changes
 */
function subscribeToQuery(): void {
  singleFileSearch.subscribe(async file => {
    triggerQuery(get(searchQuery))
  })
  searchQuery.subscribe(triggerQuery)

  async function triggerQuery(q: string): Promise<void> {
    // If we're in "single file" mode, the search results array
    // will contain a single result, related to this file
    const results = get(singleFileSearch)
      ? getSuggestions(q, { singleFile: get(singleFileSearch) })
      : getSuggestions(q)

    console.log('Search results')
    console.log(results)

    // Save the results in the store
    resultNotes.set(results)

    // Automatically select the first result
    const firstResult = results[0]
    if (firstResult) {
      await tick()
      selectedNote.set(firstResult)
    }
  }
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
export function getSuggestions(
  query: string,
  options?: Partial<{ singleFile: TFile | null }>,
): ResultNote[] {
  // Get the raw results
  let results = search(query)
  if (!results.length) return []

  // Either keep the 50 first results,
  // or the one corresponding to `singleFile`
  if (options?.singleFile) {
    const file = options.singleFile
    const result = results.find(r => r.id === file.path)
    if (result) results = [result]
    else results = []
  }
  else {
    results = results.sort((a, b) => b.score - a.score).slice(0, 50)
  }

  // Map the raw results to get usable suggestions
  const suggestions = results.map(result => {
    const note = indexedNotes.get(result.id)
    if (!note) {
      throw new Error(`Note "${result.id}" not indexed`)
    }
    const words = Object.keys(result.match)
    const matches = getMatches(note.content, stringsToRegex(words))
    const resultNote: ResultNote = {
      foundWords: words,
      occurence: 0,
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
    const app = get(plugin).app
    // console.log(`Omnisearch - adding ${file.path} to index`)
    const fileCache = app.metadataCache.getFileCache(file)
    // console.log(fileCache)

    if (indexedNotes.get(file.path)) {
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
    indexedNotes.add(note)
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
  const note = indexedNotes.get(path)
  if (note) {
    minisearchInstance.remove(note)
    indexedNotes.remove(path)
  }
}
