import type { TAbstractFile } from 'obsidian'
import type OmnisearchPlugin from './main'

export class NotesIndexer {
  private notesToReindex = new Set<TAbstractFile>()

  constructor(private plugin: OmnisearchPlugin) {}

  /**
   * Updated notes are not reindexed immediately for performance reasons.
   * They're added to a list, and reindex is done the next time we open Omnisearch.
   */
  public markNoteForReindex(note: TAbstractFile): void {
    this.notesToReindex.add(note)
  }

  public async refreshIndex(): Promise<void> {
    const paths = [...this.notesToReindex].map(n => n.path)
    if (paths.length) {
      const searchEngine = this.plugin.searchEngine
      searchEngine.removeFromPaths(paths)
      await searchEngine.addFromPaths(paths)
      this.notesToReindex.clear()
      // console.log(`Omnisearch - Reindexed ${paths.length} file(s)`)
    }
  }
}

// /**
//  * Index a non-existing note.
//  * Useful to find internal links that lead (yet) to nowhere
//  * @param name
//  * @param parent The note referencing the
//  */
// export function addNonExistingToIndex(name: string, parent: string): void {
//   name = removeAnchors(name)
//   const filename = name + (name.endsWith('.md') ? '' : '.md')
//
//   const note: IndexedDocument = {
//     path: filename,
//     basename: name,
//     mtime: 0,
//
//     content: '',
//     tags: [],
//     aliases: '',
//     headings1: '',
//     headings2: '',
//     headings3: '',
//
//     doesNotExist: true,
//     parent,
//   }
//   // searchEngine.addDocuments([note])
// }
