import {
  extractHeadingsFromCache,
  getAliasesFromMetadata,
  getTagsFromMetadata,
  isFileImage,
  isFilePDF,
  isFilePlaintext,
  removeDiacritics,
} from './tools/utils'
import type { TFile } from 'obsidian'
import type { IndexedDocument } from './globals'
import { getImageText, getPdfText } from 'obsidian-text-extract'
import { cacheManager } from './cache-manager'

/**
 * Return all plaintext files as IndexedDocuments
 */
export async function getPlainTextFiles(): Promise<IndexedDocument[]> {
  const allFiles = app.vault.getFiles().filter(f => isFilePlaintext(f.path))
  const data: IndexedDocument[] = []
  for (const file of allFiles) {
    const doc = await cacheManager.getDocument(file.path)
    data.push(doc)
    // await cacheManager.updateLiveDocument(file.path, doc)
  }
  return data
}

/**
 * Return all PDFs as IndexedDocuments.
 */
export async function getPDFAsDocuments(): Promise<IndexedDocument[]> {
  const files = app.vault.getFiles().filter(f => isFilePDF(f.path))
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
      new Promise(async (resolve, _reject) => {
        const doc = await cacheManager.getDocument(file.path)
        data.push(doc)
        return resolve(null)
      })
    )
  }
  await Promise.all(input)
  return data
}
