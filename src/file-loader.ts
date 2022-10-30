import { cacheManager } from './cache-manager'
import {
  extractHeadingsFromCache,
  getAliasesFromMetadata,
  getTagsFromMetadata,
  isFileImage,
  isFilePlaintext,
  removeDiacritics,
} from './tools/utils'
import * as NotesIndex from './notes-index'
import type { TFile } from 'obsidian'
import type { IndexedDocument } from './globals'
import { getNonExistingNotes } from './tools/notes'
import { getImageText, getPdfText } from 'obsidian-text-extract'

/**
 * Return all plaintext files as IndexedDocuments
 */
export async function getPlainTextFiles(): Promise<IndexedDocument[]> {
  const allFiles = app.vault.getFiles().filter(f => isFilePlaintext(f.path))
  const data: IndexedDocument[] = []
  for (const file of allFiles) {
    const doc = await fileToIndexedDocument(file)
    data.push(doc)
    await cacheManager.updateDocument(file.path, doc)
  }
  return data
}

/**
 * Return all PDF files as IndexedDocuments.
 * If a PDF isn't cached, it will be read from the disk and added to the IndexedDB
 */
export async function getPDFFiles(): Promise<IndexedDocument[]> {
  const allFiles = app.vault.getFiles().filter(f => f.path.endsWith('.pdf'))
  const data: IndexedDocument[] = []

  const input = []
  for (const file of allFiles) {
    input.push(
      NotesIndex.processQueue(async () => {
        const doc = await fileToIndexedDocument(file)
        await cacheManager.updateDocument(file.path, doc)
        data.push(doc)
      })
    )
  }
  await Promise.all(input)
  return data
}

/**
 * Return all Image files as IndexedDocuments.
 * If a PDF isn't cached, it will be read from the disk and added to the IndexedDB
 */
export async function getImageFiles(): Promise<IndexedDocument[]> {
  const allFiles = app.vault
    .getFiles()
    .filter(
      f =>
        f.path.endsWith('.png') ||
        f.path.endsWith('.jpg') ||
        f.path.endsWith('.jpeg')
    )
  const data: IndexedDocument[] = []

  const input = []
  for (const file of allFiles) {
    input.push(
      NotesIndex.processQueue(async () => {
        const doc = await fileToIndexedDocument(file)
        await cacheManager.updateDocument(file.path, doc)
        data.push(doc)
      })
    )
  }
  await Promise.all(input)
  return data
}

/**
 * Convert a file into an IndexedDocument.
 * Will use the cache if possible.
 * @param file
 */
export async function fileToIndexedDocument(
  file: TFile
): Promise<IndexedDocument> {
  let content: string
  if (isFilePlaintext(file.path)) {
    content = removeDiacritics(await app.vault.cachedRead(file))
  } else if (file.path.endsWith('.pdf')) {
    content = removeDiacritics(await getPdfText(file))
  } else if (isFileImage(file.path)) {
    content = removeDiacritics(await getImageText(file))
  } else {
    throw new Error('Invalid file: ' + file.path)
  }

  content = removeDiacritics(content)
  const metadata = app.metadataCache.getFileCache(file)

  // EXCALIDRAW
  // Remove the json code
  if (metadata?.frontmatter?.['excalidraw-plugin']) {
    const comments = metadata.sections?.filter(s => s.type === 'comment') ?? []
    for (const { start, end } of comments.map(c => c.position)) {
      content =
        content.substring(0, start.offset - 1) + content.substring(end.offset)
    }
  }

  // Look for links that lead to non-existing files,
  // and add them to the index.
  if (metadata) {
    const nonExisting = getNonExistingNotes(file, metadata)
    for (const name of nonExisting.filter(o => !cacheManager.getDocument(o))) {
      NotesIndex.addNonExistingToIndex(name, file.path)
    }
  }

  return {
    basename: removeDiacritics(file.basename),
    content,
    path: file.path,
    mtime: file.stat.mtime,

    tags: getTagsFromMetadata(metadata),
    aliases: getAliasesFromMetadata(metadata).join(''),
    headings1: metadata ? extractHeadingsFromCache(metadata, 1).join(' ') : '',
    headings2: metadata ? extractHeadingsFromCache(metadata, 2).join(' ') : '',
    headings3: metadata ? extractHeadingsFromCache(metadata, 3).join(' ') : '',
  }
}
