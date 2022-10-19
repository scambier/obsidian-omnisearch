import { Notice, TAbstractFile, TFile } from 'obsidian'
import {
  extractHeadingsFromCache,
  getAliasesFromMetadata,
  getTagsFromMetadata,
  isFileIndexable,
  removeDiacritics,
  wait,
} from './utils'
import { getNonExistingNotes, removeAnchors } from './notes'
import { pdfManager } from './pdf-manager'
import type { IndexedDocument } from './globals'
import { settings } from './settings'
import * as Search from './search'
// import PQueue from 'p-queue-compat'
import pLimit from 'p-limit'
import { cacheManager } from './cache-manager'

export const pdfQueue = pLimit(settings.backgroundProcesses)

/**
 * Adds a file to the search index
 * @param file
 * @returns
 */
export async function addToIndexAndCache(file: TAbstractFile): Promise<void> {
  if (!(file instanceof TFile) || !isFileIndexable(file.path)) {
    return
  }

  // Check if the file was already indexed as non-existent,
  // and if so, remove it from the index (before adding it again)
  if (cacheManager.getNoteFromMemCache(file.path)?.doesNotExist) {
    removeFromIndex(file.path)
  }

  try {
    // Look for links that lead to non-existing files,
    // and index them as well
    const metadata = app.metadataCache.getFileCache(file)
    if (metadata) {
      const nonExisting = getNonExistingNotes(file, metadata)
      for (const name of nonExisting.filter(
        o => !cacheManager.getNoteFromMemCache(o)
      )) {
        addNonExistingToIndex(name, file.path)
      }
    }

    if (cacheManager.getNoteFromMemCache(file.path)) {
      throw new Error(`${file.basename} is already indexed`)
    }

    let content
    if (file.path.endsWith('.pdf')) {
      content = removeDiacritics(await pdfManager.getPdfText(file as TFile))
    } else {
      // Fetch content from the cache to index it as-is
      content = removeDiacritics(await app.vault.cachedRead(file))
    }

    // Make the document and index it
    const note: IndexedDocument = {
      basename: removeDiacritics(file.basename),
      content,
      path: file.path,
      mtime: file.stat.mtime,

      tags: getTagsFromMetadata(metadata),
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

    Search.minisearchInstance.add(note)
    cacheManager.addNoteToMemCache(note.path, note)
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
  if (cacheManager.getNoteFromMemCache(filename)) return

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
  Search.minisearchInstance.add(note)
  cacheManager.addNoteToMemCache(filename, note)
}

/**
 * Removes a file from the index, by its path
 * @param path
 */
export function removeFromIndex(path: string): void {
  if (!isFileIndexable(path)) {
    console.info(`"${path}" is not an indexable file`)
    return
  }
  const note = cacheManager.getNoteFromMemCache(path)
  if (note) {
    Search.minisearchInstance.remove(note)
    cacheManager.removeNoteFromMemCache(path)
    cacheManager
      .getNonExistingNotesFromMemCache()
      .filter(n => n.parent === path)
      .forEach(n => {
        removeFromIndex(n.path)
      })
  } else {
    console.warn(`Omnisearch - Note not found under path ${path}`)
  }
}

const notesToReindex = new Set<TAbstractFile>()

export function addNoteToReindex(note: TAbstractFile): void {
  notesToReindex.add(note)
}

export async function refreshIndex(): Promise<void> {
  if (notesToReindex.size > 0) {
    if (settings.showIndexingNotices) {
      new Notice(`Omnisearch - Reindexing ${notesToReindex.size} notes`, 2000)
    }
    for (const note of notesToReindex) {
      removeFromIndex(note.path)
      await addToIndexAndCache(note)
      await wait(0)
    }
    notesToReindex.clear()
    await cacheManager.writeMinisearchIndex(Search.minisearchInstance)
  }
}

export async function indexPDFs() {
  if (settings.PDFIndexing) {
    const files = app.vault.getFiles().filter(f => f.path.endsWith('.pdf'))
    console.time('PDF Indexing')
    console.log(`Omnisearch - Indexing ${files.length} PDFs`)
    const input = []
    for (const file of files) {
      if (cacheManager.getNoteFromMemCache(file.path)) {
        removeFromIndex(file.path)
      }
      input.push(
        pdfQueue(async () => {
          await addToIndexAndCache(file)
          await cacheManager.writeMinisearchIndex(Search.minisearchInstance)
        })
      )
    }
    await Promise.all(input)
    // await pdfQueue.onEmpty()
    console.timeEnd('PDF Indexing')

    if (settings.showIndexingNotices) {
      new Notice(`Omnisearch - Indexed ${files.length} PDFs`)
    }

    await pdfManager.cleanCache()
  }
}
