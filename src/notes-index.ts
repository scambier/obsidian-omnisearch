import type { TAbstractFile } from 'obsidian'
import { removeAnchors } from './tools/notes'
import type { IndexedDocument } from './globals'
import { searchEngine } from './search/omnisearch'

/**
 * Index a non-existing note.
 * Useful to find internal links that lead (yet) to nowhere
 * @param name
 * @param parent The note referencing the
 */
export function addNonExistingToIndex(name: string, parent: string): void {
  name = removeAnchors(name)
  const filename = name + (name.endsWith('.md') ? '' : '.md')

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
  // searchEngine.addDocuments([note])
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
  const paths = [...notesToReindex].map(n => n.path)
  searchEngine.removeFromPaths(paths)
  searchEngine.addFromPaths(paths)
  notesToReindex.clear()
}
