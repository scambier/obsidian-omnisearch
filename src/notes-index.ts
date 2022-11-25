import { Notice, TAbstractFile, TFile } from 'obsidian'
import { isFileIndexable, wait } from './tools/utils'
import { removeAnchors } from './tools/notes'
import { SearchEngine } from './search/search-engine'
import { cacheManager } from './cache-manager'
import type { IndexedDocument } from './globals'
import { getIndexedDocument } from "./file-loader";

const indexedList: Set<string> = new Set()

/**
 * Adds a file to the search index
 * @param file
 * @returns
 */
export async function addToIndexAndMemCache(
  file: TAbstractFile
): Promise<void> {
  if (!(file instanceof TFile) || !isFileIndexable(file.path)) {
    return
  }

  try {
    if (indexedList.has(file.path)) {
      throw new Error(`${file.basename} is already indexed`)
    }

    // Make the document and index it
    SearchEngine.getEngine().addSingleToMinisearch(file.path)
    indexedList.add(file.path)
  } catch (e) {
    // console.trace('Error while indexing ' + file.basename)
    console.error(e)
  }
}

/**
 * Index a non-existing note.
 * Useful to find internal links that lead (yet) to nowhere
 * @param name
 * @param parent The note referencing the
 */
export function addNonExistingToIndex(name: string, parent: string): void {
  name = removeAnchors(name)
  const filename = name + (name.endsWith('.md') ? '' : '.md')
  if (cacheManager.getLiveDocument(filename)) return

  const note: IndexedDocument = {
    path: filename,
    basename: name,
    mtime: 0,

    content: '',
    tags: [],
    aliases: '',
    headings1: '',
    headings2: '',
    headings3: '',

    doesNotExist: true,
    parent,
  }
  SearchEngine.getEngine().addSingleToMinisearch(note.path)
}

/**
 * Removes a file from the index, by its path.
 */
export function removeFromIndex(path: string): void {
  if (!isFileIndexable(path)) {
    console.info(`"${path}" is not an indexable file`)
    return
  }
  if (indexedList.has(path)) {
    SearchEngine.getEngine().removeFromMinisearch(path)

    // FIXME: only remove non-existing notes if they don't have another parent
    // cacheManager
    //   .getNonExistingNotesFromMemCache()
    //   .filter(n => n.parent === path)
    //   .forEach(n => {
    //     removeFromIndex(n.path)
    //   })
  } else {
    console.warn(`Omnisearch - Note not found under path ${path}`)
  }
}

const notesToReindex = new Set<TAbstractFile>()

/**
 * Updated notes are not reindexed immediately for performance reasons.
 * They're added to a list, and reindex is done the next time we open Omnisearch.
 */
export function markNoteForReindex(note: TAbstractFile): void {
  notesToReindex.add(note)
}

export async function refreshIndex(): Promise<void> {
  if (notesToReindex.size > 0) {
    console.info(`Omnisearch - Reindexing ${notesToReindex.size} notes`)
    for (const note of notesToReindex) {
      removeFromIndex(note.path)
      await addToIndexAndMemCache(note)
      await wait(0)
    }
    notesToReindex.clear()
  }
}
