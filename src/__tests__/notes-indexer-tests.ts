import { describe, expect, it, vi } from 'vitest'
import { NotesIndexer } from '../notes-indexer'
import type OmnisearchPlugin from '../main'
import type { OmnisearchSettings } from '../settings/utils'

vi.mock('../main', () => ({ default: class {} }))

function setup(settings: Partial<OmnisearchSettings> = {}): NotesIndexer {
  const plugin = {
    settings: {
      hideExcluded: false,
      indexedFileTypes: [],
      indexFilesWithoutExtension: false,
      PDFIndexing: false,
      imagesIndexing: false,
      aiImageIndexing: false,
      unsupportedFilesIndexing: 'no',
      ...settings,
    },
    // Text Extractor is installed, AI Image Analyzer is not
    getTextExtractor: () => ({}),
    getAIImageAnalyzer: () => undefined,
  } as unknown as OmnisearchPlugin
  return new NotesIndexer(plugin)
}

describe('NotesIndexer', () => {
  describe('isFilePlaintext', () => {
    it('should match extensions regardless of their case', () => {
      const indexer = setup({ indexedFileTypes: ['txt'] })
      expect(indexer.isFilePlaintext('README.MD')).toBe(true)
      expect(indexer.isFilePlaintext('notes.TXT')).toBe(true)
    })
    it('should match extensions written in uppercase in the settings', () => {
      const indexer = setup({ indexedFileTypes: ['TXT'] })
      expect(indexer.isFilePlaintext('notes.txt')).toBe(true)
    })
    it('should not match other extensions', () => {
      const indexer = setup({ indexedFileTypes: ['txt'] })
      expect(indexer.isFilePlaintext('archive.ZIP')).toBe(false)
    })
  })

  describe('isFileIndexable', () => {
    it('should index images and PDFs that have an uppercase extension', () => {
      const indexer = setup({ imagesIndexing: true, PDFIndexing: true })
      expect(indexer.isFileIndexable('Photos/IMG_0001.JPG')).toBe(true)
      expect(indexer.isFileIndexable('Scans/Invoice.PDF')).toBe(true)
    })
  })
})
