import { Notice, TFile, type TAbstractFile } from 'obsidian'
import MiniSearch from 'minisearch'
import type { IndexedNote, ResultNote } from './globals'
import { indexedNotes, plugin } from './stores'
import { get } from 'svelte/store'
import {
  escapeHTML,
  escapeRegex,
  extractHeadingsFromCache,
  getAllIndexes,
  highlighter,
  wait,
} from './utils'

let minisearch: MiniSearch<IndexedNote>

export async function instantiateMinisearch(): Promise<void> {
  indexedNotes.set({})
  minisearch = new MiniSearch({
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
    await addToIndex(files[i])
  }

  if (files.length > 0) {
    new Notice(
      `Omnisearch - Indexed ${files.length} notes in ${
        new Date().getTime() - start
      }ms`,
    )
  }
}

export function getSuggestions(query: string): ResultNote[] {
  const results = minisearch
    .search(query, {
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
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
  // console.log(`Omnisearch - Results for "${query}"`)
  // console.log(results)

  const suggestions = results.map(result => {
    const note = indexedNotes.get(result.id)
    if (!note) {
      throw new Error(`Note "${result.id}" not indexed`)
    }
    let basename = escapeHTML(note.basename)
    let content = escapeHTML(note.content)

    // Sort the terms from smaller to larger
    // and highlight them in the title and body
    const terms = result.terms.sort((a, b) => a.length - b.length)
    const reg = new RegExp(terms.map(escapeRegex).join('|'), 'gi')
    const matches = getAllIndexes(content, reg)

    // If the body contains a searched term, find its position
    // and trim the text around it
    const pos = content.toLowerCase().indexOf(result.terms[0])
    const surroundLen = 180
    if (pos > -1) {
      const from = Math.max(0, pos - surroundLen)
      const to = Math.min(content.length - 1, pos + surroundLen)
      content =
        (from > 0 ? '…' : '') +
        content.slice(from, to).trim() +
        (to < content.length - 1 ? '…' : '')
    }

    // console.log(matches)
    content = content.replace(reg, highlighter)
    basename = basename.replace(reg, highlighter)

    const resultNote: ResultNote = {
      content,
      basename,
      path: note.path,
      matches,
      occurence: 0,
    }

    return resultNote
  })

  return suggestions
}

export async function addToIndex(file: TAbstractFile): Promise<void> {
  if (!(file instanceof TFile) || file.extension !== 'md') return
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
    minisearch.add(note)
    indexedNotes.add(note)
  }
  catch (e) {
    console.trace('Error while indexing ' + file.basename)
    console.error(e)
  }
}

export function removeFromIndex(file: TAbstractFile): void {
  if (file instanceof TFile && file.path.endsWith('.md')) {
    // console.log(`Omnisearch - removing ${file.path} from index`)
    return removeFromIndexByPath(file.path)
  }
}

export function removeFromIndexByPath(path: string): void {
  const note = indexedNotes.get(path)
  if (note) {
    minisearch.remove(note)
    indexedNotes.remove(path)
  }
}
