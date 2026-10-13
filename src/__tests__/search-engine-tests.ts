import { describe, expect, it } from 'vitest'
import { SearchEngine } from '../search/search-engine'
import { Query } from '../search/query'
import type { IndexedDocument } from '../globals'
import type OmnisearchPlugin from '../main'

function makeDocument(path: string, content: string): IndexedDocument {
  const filename = path.split('/').pop() ?? path
  return {
    path,
    basename: filename.replace(/\.[^.]+$/, ''),
    displayTitle: '',
    mtime: 0,
    content,
    aliases: '',
    tags: [],
    unmarkedTags: [],
    headings1: '',
    headings2: '',
    headings3: '',
  }
}

async function setup(documents: IndexedDocument[]): Promise<SearchEngine> {
  const plugin = {
    settings: {
      fuzziness: '1',
      recencyBoost: '0',
      hideExcluded: false,
      downrankedFoldersFilters: [],
      weightCustomProperties: [],
      displayTitle: '',
      ignoreDiacritics: true,
      ignoreArabicDiacritics: false,
      splitCamelCase: false,
      tokenizeUrls: false,
    },
    app: {
      metadataCache: { getCache: () => null },
      vault: { getAbstractFileByPath: () => ({}) },
    },
    documentsRepository: {
      getDocument: async (path: string) => documents.find(d => d.path === path),
    },
    getChsSegmenter: () => undefined,
  } as unknown as OmnisearchPlugin
  const searchEngine = new SearchEngine(plugin)
  await searchEngine.addFromPaths(documents.map(d => d.path))
  return searchEngine
}

describe('SearchEngine', () => {
  describe('search', () => {
    it('should filter by extension regardless of its case', async () => {
      // Arrange
      const searchEngine = await setup([
        makeDocument('Photos/IMG_0001.JPG', 'receipt'),
        makeDocument('receipt.md', 'receipt'),
      ])
      const query = new Query('receipt .jpg', {
        ignoreDiacritics: true,
        ignoreArabicDiacritics: false,
      })
      // Act
      const results = await searchEngine.search(query, { prefixLength: 1 })
      // Assert
      expect(results.map(r => r.id as string)).toEqual(['Photos/IMG_0001.JPG'])
    })
  })
})
