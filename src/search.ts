import { Notice, TAbstractFile, TFile } from 'obsidian'
import MiniSearch, { type SearchResult } from 'minisearch'
import {
  chsRegex,
  SPACE_OR_PUNCTUATION,
  type IndexedNote,
  type ResultNote,
  type SearchMatch,
} from './globals'
import {
  extractHeadingsFromCache,
  getAliasesFromMetadata,
  stringsToRegex,
  stripMarkdownCharacters,
  wait,
} from './utils'
import type { Query } from './query'
import { settings } from './settings'
import {
  removeNoteFromCache,
  getNoteFromCache,
  getNonExistingNotes,
  resetNotesCache,
  addNoteToCache,
  removeAnchors,
  getNonExistingNotesFromCache,
  loadNotesCache,
  saveNotesCacheToFile,
  isCacheOutdated
} from './notes'

let minisearchInstance: MiniSearch<IndexedNote>
let isIndexChanged: boolean
const searchIndexFilePath = `${app.vault.configDir}/plugins/omnisearch/searchIndex.json`

const tokenize = (text: string): string[] => {
  const tokens = text.split(SPACE_OR_PUNCTUATION)
  const chsSegmenter = (app as any).plugins.plugins['cm-chs-patch']

  if (chsSegmenter) {
    return tokens.flatMap(word =>
      chsRegex.test(word) ? chsSegmenter.cut(word) : [word],
    )
  }
  else return tokens
}

/**
 * Initializes the MiniSearch instance,
 * and adds all the notes to the index
 */
export async function initGlobalSearchIndex(): Promise<void> {
  const options = {
    tokenize,
    idField: 'path',
    fields: [
      'basename',
      'aliases',
      'content',
      'headings1',
      'headings2',
      'headings3',
    ],
  }

  if (settings.storeIndexInFile && await app.vault.adapter.exists(searchIndexFilePath)) {
    try {
      const json = await app.vault.adapter.read(searchIndexFilePath)
      minisearchInstance = MiniSearch.loadJSON(json, options)
      console.log('MiniSearch index loaded from the file')
      await loadNotesCache()
    }
    catch(e) {
      console.trace('Could not load MiniSearch index from the file')
      console.error(e)
    }
  }
  
  if (!minisearchInstance) {
    minisearchInstance = new MiniSearch(options)
    resetNotesCache()
  }

  // Index files that are already present
  const start = new Date().getTime()

  const allFiles = app.vault.getMarkdownFiles()

  let files
  let notesSuffix
  if (settings.storeIndexInFile) {
    files = allFiles.filter(file => isCacheOutdated(file))
    notesSuffix = 'modified notes'
  } else {
    files = allFiles
    notesSuffix = 'notes'
  }

  console.log(`Omnisearch - indexing ${files.length} ${notesSuffix}`)

  // This is basically the same behavior as MiniSearch's `addAllAsync()`.
  // We index files by batches of 10
  for (let i = 0; i < files.length; ++i) {
    if (i % 10 === 0) await wait(0)
    const file = files[i]
    if (file) {
      if (getNoteFromCache(file.path)) {
        removeFromIndex(file.path)
      }
      await addToIndex(file)
    }
  }

  if (files.length > 0) {
    const message = `Omnisearch - Indexed ${files.length} ${notesSuffix} in ${
        new Date().getTime() - start
      }ms`

    console.log(message)

    if (settings.showIndexingNotices) {
      new Notice(message)
    }

    await saveIndexToFile()
  }
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
        result.score /= 3 // TODO: make this value configurable or toggleable?
      }
    })
  }

  // If the search query contains quotes, filter out results that don't have the exact match
  const exactTerms = query.getExactTerms()
  if (exactTerms.length) {
    results = results.filter(r => {
      const title = getNoteFromCache(r.id)?.path.toLowerCase() ?? ''
      const content = stripMarkdownCharacters(
        getNoteFromCache(r.id)?.content ?? '',
      ).toLowerCase()
      return exactTerms.every(q => content.includes(q) || title.includes(q))
    })
  }

  // If the search query contains exclude terms, filter out results that have them
  const exclusions = query.exclusions
  if (exclusions.length) {
    results = results.filter(r => {
      const content = stripMarkdownCharacters(
        getNoteFromCache(r.id)?.content ?? '',
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
  let count = 0 // TODO: FIXME: this is a hack to avoid infinite loops
  while ((match = reg.exec(text)) !== null) {
    if (++count > 100) break
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
    results = results.slice(0, 50)
  }

  // Map the raw results to get usable suggestions
  const suggestions = results.map(result => {
    const note = getNoteFromCache(result.id)
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

  // Check if the file was already indexed as non-existent,
  // and if so, remove it from the index (before adding it again)
  if (getNoteFromCache(file.path)?.doesNotExist) {
    removeFromIndex(file.path)
  }

  try {
    // console.log(`Omnisearch - adding ${file.path} to index`)

    // Look for links that lead to non-existing files,
    // and index them as well
    const metadata = app.metadataCache.getFileCache(file)
    if (metadata) {
      const nonExisting = getNonExistingNotes(file, metadata)
      for (const name of nonExisting.filter(o => !getNoteFromCache(o))) {
        addNonExistingToIndex(name, file.path)
      }
    }

    if (getNoteFromCache(file.path)) {
      throw new Error(`${file.basename} is already indexed`)
    }

    // Fetch content from the cache to index it as-is
    const content = await app.vault.cachedRead(file)

    // Make the document and index it
    const note: IndexedNote = {
      basename: file.basename,
      content,
      path: file.path,
      mtime: file.stat.mtime,

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

    minisearchInstance.add(note)
    isIndexChanged = true
    addNoteToCache(note.path, note)
  }
  catch (e) {
    console.trace('Error while indexing ' + file.basename)
    console.error(e)
  }
}

/**
 * Index a non-existing note.
 * Useful to find internal links that lead (yet) to nowhere
 * @param name
 */
export function addNonExistingToIndex(name: string, parent: string): void {
  name = removeAnchors(name)
  if (getNoteFromCache(name)) return

  const filename = name + (name.endsWith('.md') ? '' : '.md')
  const note = {
    path: filename,
    basename: name,
    mtime: 0,

    content: '',
    aliases: '',
    headings1: '',
    headings2: '',
    headings3: '',

    doesNotExist: true,
    parent,
  } as IndexedNote
  minisearchInstance.add(note)
  isIndexChanged = true
  addNoteToCache(filename, note)
}

/**
 * Removes a file from the index, by its path
 * @param path
 */
export function removeFromIndex(path: string): void {
  if (!path.endsWith('.md')) {
    console.info(`"${path}" is not a .md file`)
    return
  }
  const note = getNoteFromCache(path)
  if (note) {
    minisearchInstance.remove(note)
    isIndexChanged = true
    removeNoteFromCache(path)
    getNonExistingNotesFromCache()
      .filter(n => n.parent === path)
      .forEach(n => {
        removeFromIndex(n.path)
      })
  }
  else {
    console.warn(`not not found under path ${path}`)
  }
}

const notesToReindex = new Set<TAbstractFile>()
export function addNoteToReindex(note: TAbstractFile): void {
  notesToReindex.add(note)
}
export async function reindexNotes(): Promise<void> {
  for (const note of notesToReindex) {
    removeFromIndex(note.path)
    await addToIndex(note)
  }
  notesToReindex.clear()

  await saveIndexToFile()
}

async function saveIndexToFile(): Promise<void> {
  if (settings.storeIndexInFile && minisearchInstance && isIndexChanged) {
    const json = JSON.stringify(minisearchInstance)
    await app.vault.adapter.write(searchIndexFilePath, json)
    console.log('MiniSearch index saved to the file')

    await saveNotesCacheToFile()
    isIndexChanged = false
  }
}
