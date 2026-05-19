jest.mock(
  'obsidian',
  () => ({
    getAllTags: jest.fn(() => []),
    MarkdownView: class MarkdownView {},
    Notice: jest.fn(),
    parseFrontMatterAliases: jest.fn(() => []),
    Platform: {},
    TFile: class TFile {},
    WorkspaceLeaf: class WorkspaceLeaf {},
  }),
  { virtual: true }
)
jest.mock(
  'svelte/store',
  () => ({
    writable: jest.fn(() => ({
      set: jest.fn(),
      subscribe: jest.fn(),
      update: jest.fn(),
    })),
  }),
  { virtual: true }
)

import { NotesIndexer } from '../notes-indexer'

describe('NotesIndexer', () => {
  test('removes deleted notes from the reindex queue by path', async () => {
    const addDocument = jest.fn()
    const removeFromPaths = jest.fn()
    const addFromPaths = jest.fn()
    const plugin = {
      documentsRepository: { addDocument },
      searchEngine: { removeFromPaths, addFromPaths },
      settings: {},
      app: { metadataCache: {} },
      getTextExtractor: () => null,
      getAIImageAnalyzer: () => null,
    }
    const notesIndexer = new NotesIndexer(plugin as unknown as ConstructorParameters<typeof NotesIndexer>[0])

    notesIndexer.flagNoteForReindex({ path: 'deleted.md' } as Parameters<NotesIndexer['flagNoteForReindex']>[0])
    notesIndexer.unflagNoteForReindex('deleted.md')

    await notesIndexer.refreshIndex()

    expect(addDocument).not.toHaveBeenCalled()
    expect(removeFromPaths).not.toHaveBeenCalled()
    expect(addFromPaths).not.toHaveBeenCalled()
  })
})
