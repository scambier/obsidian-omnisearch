import { Notice, TAbstractFile, TFile } from 'obsidian'
import { isFileIndexable, wait } from './tools/utils'
import { removeAnchors } from './tools/notes'
import { settings } from './settings'
import { SearchEngine } from './search/search-engine'
import { cacheManager } from './cache-manager'
import pLimit from 'p-limit'
import type { IndexedDocument } from './globals'
import { fileToIndexedDocument } from './file-loader'

/**
 * Use this processing queue to handle all heavy work
 */
export const processQueue = pLimit(settings.backgroundProcesses)

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

  // Check if the file was already indexed as non-existent.
  // If so, remove it from the index, and add it again as a real note.
  if (cacheManager.getDocument(file.path)?.doesNotExist) {
    removeFromIndex(file.path)
  }

  try {
    if (cacheManager.getDocument(file.path)) {
      throw new Error(`${file.basename} is already indexed`)
    }

    // Make the document and index it
    const note = await fileToIndexedDocument(file)
    SearchEngine.getEngine().addSingleToMinisearch(note)
    await cacheManager.updateDocument(note.path, note)
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
  if (cacheManager.getDocument(filename)) return

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
  SearchEngine.getEngine().addSingleToMinisearch(note)
  cacheManager.updateDocument(filename, note)
}

/**
 * Removes a file from the index, by its path.
 */
export function removeFromIndex(path: string): void {
  if (!isFileIndexable(path)) {
    console.info(`"${path}" is not an indexable file`)
    return
  }
  const note = cacheManager.getDocument(path)
  if (note) {
    SearchEngine.getEngine().removeFromMinisearch(note)
    cacheManager.deleteDocument(path)

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
    if (settings.showIndexingNotices) {
      new Notice(`Omnisearch - Reindexing ${notesToReindex.size} notes`, 2000)
    }
    for (const note of notesToReindex) {
      removeFromIndex(note.path)
      await addToIndexAndMemCache(note)
      await wait(0)
    }
    notesToReindex.clear()
  }
}
