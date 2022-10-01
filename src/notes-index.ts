import { Notice, TAbstractFile, TFile } from 'obsidian'
import {
  extractHeadingsFromCache,
  getAliasesFromMetadata,
  getTagsFromMetadata, isFileIndexable,
  isFilePlaintext,
  removeDiacritics,
  wait,
} from './utils'
import {
  addNoteToCache,
  getNonExistingNotes,
  getNonExistingNotesFromCache,
  getNoteFromCache,
  removeAnchors,
  removeNoteFromCache,
  saveNotesCacheToFile,
} from './notes'
import { getPdfText } from './pdf-parser'
import type { IndexedNote } from './globals'
import { searchIndexFilePath } from './globals'
import { settings } from './settings'
import { minisearchInstance } from './search'

let isIndexChanged: boolean

/**
 * Adds a file to the index
 * @param file
 * @returns
 */
export async function addToIndex(file: TAbstractFile): Promise<void> {
  if (!(file instanceof TFile) || !isFileIndexable(file.path)) {
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

    let content
    if (file.path.endsWith('.pdf')) {
      content = removeDiacritics(await getPdfText(file as TFile))
    } else {
      // Fetch content from the cache to index it as-is
      content = removeDiacritics(await app.vault.cachedRead(file))
    }

    // Make the document and index it
    const note: IndexedNote = {
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

    minisearchInstance.add(note)
    isIndexChanged = true
    addNoteToCache(note.path, note)
  } catch (e) {
    console.trace('Error while indexing ' + file.basename)
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
  if (getNoteFromCache(filename)) return

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
  if (!isFilePlaintext(path)) {
    console.info(`"${path}" is not an indexable file`)
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
  } else {
    console.warn(`not not found under path ${path}`)
  }
}

const notesToReindex = new Set<TAbstractFile>()

export function addNoteToReindex(note: TAbstractFile): void {
  notesToReindex.add(note)
}

export async function refreshIndex(): Promise<void> {
  if (settings.showIndexingNotices && notesToReindex.size > 0) {
    new Notice(`Omnisearch - Reindexing ${notesToReindex.size} notes`, 2000)
  }
  for (const note of notesToReindex) {
    removeFromIndex(note.path)
    await addToIndex(note)
    await wait(0)
  }
  notesToReindex.clear()

  await saveIndexToFile()
}

export async function saveIndexToFile(): Promise<void> {
  if (settings.storeIndexInFile && minisearchInstance && isIndexChanged) {
    const json = JSON.stringify(minisearchInstance)
    await app.vault.adapter.write(searchIndexFilePath, json)
    console.log('Omnisearch - Index saved on disk')

    await saveNotesCacheToFile()
    isIndexChanged = false
  }
}
