jest.mock(
  'obsidian',
  () => ({
    Notice: class Notice {},
    Platform: { isMobile: false },
    getAllTags: () => [],
    parseFrontMatterAliases: () => [],
  }),
  { virtual: true }
)

jest.mock('svelte/store', () => ({
  writable: (value: unknown) => ({
    subscribe: () => () => undefined,
    set: () => undefined,
    update: (updater: (current: unknown) => unknown) => updater(value),
  }),
}))

jest.mock('markdown-link-extractor', () => () => [])

import type { IndexedDocument } from '../globals'
import type OmnisearchPlugin from '../main'
import { Query } from '../search/query'
import { SearchEngine } from '../search/search-engine'

const makeDocument = (
  path: string,
  content: string,
  overrides: Partial<IndexedDocument> = {}
): IndexedDocument => ({
  path,
  basename: path.replace(/\.md$/, ''),
  displayTitle: '',
  mtime: 1,
  content,
  cleanedContent: content,
  aliases: '',
  tags: [],
  unmarkedTags: [],
  headings1: '',
  headings2: '',
  headings3: '',
  ...overrides,
})

const query = (text: string) =>
  new Query(text, {
    ignoreDiacritics: false,
    ignoreArabicDiacritics: false,
  })

const makePlugin = (
  documents: IndexedDocument[],
  cache: unknown = null,
  chsSegmenter?: unknown
) => {
  const byPath = new Map(documents.map(document => [document.path, document]))
  return {
    settings: {
      tokenizeUrls: false,
      ignoreDiacritics: false,
      ignoreArabicDiacritics: false,
      fuzziness: '0',
      recencyBoost: '0',
      weightBasename: 2,
      weightDirectory: 1,
      weightH1: 1,
      weightH2: 1,
      weightH3: 1,
      weightUnmarkedTags: 1,
      weightCustomProperties: [],
      downrankedFoldersFilters: [],
      hideExcluded: false,
      simpleSearch: false,
      maxEmbeds: 0,
    },
    getChsSegmenter: () => chsSegmenter,
    documentsRepository: {
      getDocument: jest.fn(async (path: string) => byPath.get(path)),
    },
    embedsRepository: {
      loadFromCache: jest.fn(async () => undefined),
      getEmbeds: (_path: string): string[] => [],
    },
    database: {
      getMinisearchCache: jest.fn(async () => cache),
    },
    app: {
      metadataCache: {
        isUserIgnored: () => false,
        getCache: () => null,
      },
    },
    textProcessor: {
      getMatches: jest.fn(() => []),
    },
  }
}

const createEngine = async (documents: IndexedDocument[]) => {
  const plugin = makePlugin(documents)
  const engine = new SearchEngine(plugin as unknown as OmnisearchPlugin)
  await engine.addFromPaths(documents.map(document => document.path))
  return { engine, plugin }
}

const search = (engine: SearchEngine, text: string) =>
  engine.search(query(text), { prefixLength: 1 })

describe('SearchEngine Han substring fallback', () => {
  it('recalls the reported internal bigram without enabling single-char infix', async () => {
    const { engine } = await createEngine([
      makeDocument('example.md', '周五的时候'),
    ])

    await expect(search(engine, '周五')).resolves.toHaveLength(1)
    await expect(search(engine, '时候')).resolves.toEqual([
      expect.objectContaining({ tags: [], mtime: 1 }),
    ])
    await expect(search(engine, '时')).resolves.toHaveLength(0)
  })

  it('verifies long runs and rejects separated or cross-field grams', async () => {
    const { engine } = await createEngine([
      makeDocument('true.md', '前甲乙丙后'),
      makeDocument('separated.md', '甲乙在前，乙丙在后'),
      makeDocument('cross-field.md', '乙丙', { basename: '甲乙' }),
    ])

    await expect(search(engine, '甲乙丙')).resolves.toEqual([
      expect.objectContaining({ id: 'true.md' }),
    ])
  })

  it('verifies before top-50 so false gram candidates cannot hide a true hit', async () => {
    const falseCandidates = Array.from({ length: 60 }, (_, index) =>
      makeDocument(
        `false-${index}.md`,
        '甲乙 甲乙 甲乙在前，乙丙 乙丙 乙丙在后'
      )
    )
    const { engine } = await createEngine([
      ...falseCandidates,
      makeDocument('true.md', '甲乙丙'),
    ])

    await expect(search(engine, '甲乙丙')).resolves.toEqual([
      expect.objectContaining({ id: 'true.md' }),
    ])
  })

  it('stops cold candidate hydration after the active batch is aborted', async () => {
    const documents = [
      ...Array.from({ length: 120 }, (_, index) =>
        makeDocument(`false-${index}.md`, '甲乙在前，乙丙在后')
      ),
      makeDocument('true.md', '甲乙丙'),
    ]
    const { engine, plugin } = await createEngine(documents)
    const controller = new AbortController()
    let hydrationCount = 0
    plugin.documentsRepository.getDocument.mockImplementation(
      async (path: string) => {
        hydrationCount++
        if (hydrationCount === 1) controller.abort()
        return documents.find(document => document.path === path)
      }
    )

    await expect(
      engine.search(query('甲乙丙'), {
        prefixLength: 1,
        signal: controller.signal,
      })
    ).resolves.toEqual([])
    expect(hydrationCount).toBeLessThanOrEqual(50)
  })

  it('stops embed hydration after the active suggestion request is aborted', async () => {
    const documents = [
      makeDocument('main.md', '周五的时候'),
      makeDocument('embed-1.md', ''),
      makeDocument('embed-2.md', ''),
    ]
    const { engine, plugin } = await createEngine(documents)
    const controller = new AbortController()
    plugin.settings.maxEmbeds = 2
    plugin.embedsRepository.getEmbeds = jest.fn((path: string) =>
      path === 'main.md' ? ['embed-1.md', 'embed-2.md'] : []
    )
    plugin.documentsRepository.getDocument.mockImplementation(
      async (path: string) => {
        if (path === 'embed-1.md') controller.abort()
        return documents.find(document => document.path === path)
      }
    )
    plugin.documentsRepository.getDocument.mockClear()

    await expect(
      engine.getSuggestions(query('时候'), { signal: controller.signal })
    ).resolves.toEqual([])
    expect(plugin.documentsRepository.getDocument).not.toHaveBeenCalledWith(
      'embed-2.md'
    )
  })

  it('keeps separated Latin constraints in the fallback branch', async () => {
    const { engine } = await createEngine([
      makeDocument('a.md', 'projectA 周五的时候'),
      makeDocument('b.md', 'projectB 周五的时候'),
    ])

    await expect(search(engine, 'projectA 时候')).resolves.toEqual([
      expect.objectContaining({ id: 'a.md' }),
    ])
  })

  it('preserves path, extension, quote, and exclusion filters', async () => {
    const { engine } = await createEngine([
      makeDocument('folder/keep.md', '前甲乙丙后 周五的时候'),
      makeDocument('folder/excluded.md', '前甲乙丙后 周五的时候 排除'),
      makeDocument('other/keep.md', '前甲乙丙后 周五的时候'),
      makeDocument('folder/keep.txt', '前甲乙丙后 周五的时候'),
      makeDocument('folder/quote.md', 'foo xxx bar'),
    ])

    await expect(
      search(engine, '"甲乙丙" path:folder ext:md -排除')
    ).resolves.toEqual([expect.objectContaining({ id: 'folder/keep.md' })])
    await expect(
      engine.search(query('甲乙丙 -排除'), {
        prefixLength: 1,
        singleFilePath: 'folder/excluded.md',
      })
    ).resolves.toEqual([])
    await expect(
      engine.search(query('"foo bar"'), {
        prefixLength: 1,
        singleFilePath: 'folder/quote.md',
      })
    ).resolves.toEqual([])
  })

  it('does not broaden attached mixed-script or non-Han script queries', async () => {
    const { engine } = await createEngine([
      makeDocument('mixed.md', '前时候bar后 foo周五的时候'),
      makeDocument('japanese.md', '食べる'),
      makeDocument('korean.md', '한국어검색'),
      makeDocument('latin.md', 'projectAlpha'),
    ])

    await expect(search(engine, '时候bar')).resolves.toHaveLength(0)
    await expect(search(engine, 'foo时候')).resolves.toHaveLength(0)
    await expect(search(engine, 'べる')).resolves.toHaveLength(0)
    await expect(search(engine, '검색')).resolves.toHaveLength(0)
    const latinQuery = query('project')
    const rawTextSpy = jest.spyOn(latinQuery, 'rawSegmentsToStr')
    await expect(
      engine.search(latinQuery, { prefixLength: 1 })
    ).resolves.toEqual([expect.objectContaining({ id: 'latin.md' })])
    expect(rawTextSpy).not.toHaveBeenCalled()
  })

  it('keeps compatibility ideographs raw so retrieval and highlighting agree', async () => {
    const { engine } = await createEngine([
      makeDocument('compatibility.md', '神社'),
    ])

    await expect(search(engine, '神社')).resolves.toHaveLength(0)
    await expect(search(engine, '神社')).resolves.toHaveLength(1)
  })

  it('keeps raw Han fallback semantics when diacritic folding is enabled', async () => {
    const documents = [makeDocument('compatibility.md', '前神社後面')]
    const plugin = makePlugin(documents)
    plugin.settings.ignoreDiacritics = true
    const engine = new SearchEngine(plugin as unknown as OmnisearchPlugin)
    await engine.addFromPaths(['compatibility.md'])
    const normalizedQuery = (text: string) =>
      new Query(text, {
        ignoreDiacritics: true,
        ignoreArabicDiacritics: false,
      })
    const run = (text: string) =>
      engine.search(normalizedQuery(text), { prefixLength: 1 })

    await expect(run('神社')).resolves.toHaveLength(1)
    await expect(run('神社')).resolves.toHaveLength(0)
    await expect(run('神社後')).resolves.toHaveLength(1)
    await engine.getSuggestions(normalizedQuery('神社後'))
    expect(plugin.textProcessor.getMatches).toHaveBeenLastCalledWith(
      '前神社後面',
      ['神社後'],
      expect.any(Query)
    )
  })

  it('keeps an attached mixed token as a legacy constraint without disabling other Han fallback', async () => {
    const { engine } = await createEngine([
      makeDocument('match.md', '周五的时候 foo中文bar'),
      makeDocument('wrong-mixed.md', '周五的时候 foo其他bar'),
    ])

    await expect(search(engine, '时候 foo中文bar')).resolves.toEqual([
      expect.objectContaining({ id: 'match.md' }),
    ])
  })

  it('highlights the original long run instead of overlapping grams', async () => {
    const { engine, plugin } = await createEngine([
      makeDocument('true.md', '前甲乙丙后'),
    ])

    await engine.getSuggestions(query('甲乙丙'))
    expect(plugin.textProcessor.getMatches).toHaveBeenCalledWith(
      '前甲乙丙后',
      ['甲乙丙'],
      expect.any(Query)
    )
  })

  it('rejects an unsigned cache and reuses a matching signed cache', async () => {
    const documents = [makeDocument('example.md', '周五的时候')]
    const { engine } = await createEngine(documents)
    const cache = {
      paths: engine.getSerializedIndexedDocuments(),
      data: engine.getSerializedMiniSearch(),
      indexSignature: engine.getIndexSignature(),
    }

    const unsignedPlugin = makePlugin(documents, {
      ...cache,
      indexSignature: undefined,
    })
    await expect(
      new SearchEngine(
        unsignedPlugin as unknown as OmnisearchPlugin
      ).loadCache()
    ).resolves.toBe(false)

    const signedPlugin = makePlugin(documents, cache)
    const loadedEngine = new SearchEngine(
      signedPlugin as unknown as OmnisearchPlugin
    )
    await expect(loadedEngine.loadCache()).resolves.toBe(true)
    await expect(search(loadedEngine, '时候')).resolves.toHaveLength(1)
  })

  it('falls back safely when Chs Patch throws', async () => {
    const documents = [
      makeDocument('example.md', 'projectA 周五的时候'),
      makeDocument('mixed.md', 'foo中文bar'),
    ]
    const plugin = makePlugin(documents, null, {
      manifest: { version: 'test' },
      cut: () => {
        throw new Error('segmenter failed')
      },
    })
    const engine = new SearchEngine(plugin as unknown as OmnisearchPlugin)
    await engine.addFromPaths(documents.map(document => document.path))

    await expect(search(engine, 'projectA')).resolves.toHaveLength(1)
    await expect(search(engine, '时候')).resolves.toHaveLength(1)

    const cache = {
      paths: engine.getSerializedIndexedDocuments(),
      data: engine.getSerializedMiniSearch(),
      indexSignature: engine.getIndexSignature(),
    }
    const healthyPlugin = makePlugin(documents, cache, {
      manifest: { version: 'test' },
      cut: (word: string) =>
        word === 'foo中文bar' ? ['foo', '中文', 'bar'] : [word],
    })
    const healthyEngine = new SearchEngine(
      healthyPlugin as unknown as OmnisearchPlugin
    )
    await expect(healthyEngine.loadCache()).resolves.toBe(false)
    await healthyEngine.addFromPaths(documents.map(document => document.path))
    await expect(search(healthyEngine, 'foo中文bar')).resolves.toEqual([
      expect.objectContaining({ id: 'mixed.md' }),
    ])
  })
})
