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
import { getPdfText, getImageText } from 'obsidian-text-extract'

/**
 * Return all plaintext files as IndexedDocuments
 */
export async function getPlainTextFiles(): Promise<IndexedDocument[]> {
  const allFiles = app.vault.getFiles().filter(f => isFilePlaintext(f.path))
  const data: IndexedDocument[] = []
  for (const file of allFiles) {
    const doc = await fileToIndexedDocument(file)
    data.push(doc)
    await cacheManager.updateLiveDocument(file.path, doc)
  }
  return data
}

/**
 * Return all PDFs as IndexedDocuments.
 */
export async function getPDFAsDocuments(): Promise<IndexedDocument[]> {
  const files = app.vault.getFiles().filter(f => f.path.endsWith('.pdf'))
  return await getBinaryFiles(files)
}

/**
 * Return all imageas as IndexedDocuments.
 */
export async function getImagesAsDocuments(): Promise<IndexedDocument[]> {
  const files = app.vault.getFiles().filter(f => isFileImage(f.path))
  return await getBinaryFiles(files)
}

async function getBinaryFiles(files: TFile[]): Promise<IndexedDocument[]> {
  const data: IndexedDocument[] = []
  const input = []
  for (const file of files) {
    input.push(
      new Promise(async (resolve, reject) => {
        const doc = await fileToIndexedDocument(file)
        await cacheManager.updateLiveDocument(file.path, doc)
        data.push(doc)
        return resolve(null)
      })
    )
  }
  await Promise.all(input)
  return data
}

/**
 * Convert a file into an IndexedDocument.
 * Will use the cache if possible.
 */
export async function fileToIndexedDocument(
  file: TFile
): Promise<IndexedDocument> {
  let content: string
  if (isFilePlaintext(file.path)) {
    content = await app.vault.cachedRead(file)
  } else if (file.path.endsWith('.pdf')) {
    content = await getPdfText(file)
  } else if (isFileImage(file.path)) {
    content = await getImageText(file)
  } else {
    throw new Error('Invalid file: ' + file.path)
  }

  content = removeDiacritics(content)
  const metadata = app.metadataCache.getFileCache(file)

  // Look for links that lead to non-existing files,
  // and add them to the index.
  if (metadata) {
    // FIXME: https://github.com/scambier/obsidian-omnisearch/issues/129
    const nonExisting = getNonExistingNotes(file, metadata)
    for (const name of nonExisting.filter(
      o => !cacheManager.getLiveDocument(o)
    )) {
      NotesIndex.addNonExistingToIndex(name, file.path)
    }

    // EXCALIDRAW
    // Remove the json code
    if (metadata.frontmatter?.['excalidraw-plugin']) {
      const comments =
        metadata.sections?.filter(s => s.type === 'comment') ?? []
      for (const { start, end } of comments.map(c => c.position)) {
        content =
          content.substring(0, start.offset - 1) + content.substring(end.offset)
      }
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
