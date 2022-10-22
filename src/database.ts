import Dexie from 'dexie'
import type { IndexedDocument } from './globals'

class OmnisearchCache extends Dexie {
  pdf!: Dexie.Table<
    { path: string; hash: string; size: number; text: string },
    string
  >
  documents!: Dexie.Table<
    { document: IndexedDocument; path: string; mtime: number },
    string
  >
  minisearch!: Dexie.Table<string>

  constructor() {
    super(app.appId + '_omnisearch')
    this.version(2).stores({
      pdf: 'path, hash, size, text',
      documents: 'path, mtime, document',
      minisearch: 'data',
    })
  }
}

export const database = new OmnisearchCache()
