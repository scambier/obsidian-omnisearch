import Dexie from 'dexie'
import type { IndexedDocument } from './globals'

class OmnisearchCache extends Dexie {
  pdf!: Dexie.Table<
    { path: string; hash: string; size: number; text: string },
    string
  >
  searchHistory!: Dexie.Table<{ id?: number; query: string }, number>

  constructor() {
    super(app.appId + '_omnisearch')
    this.version(3).stores({
      pdf: 'path, hash, size, text',
      searchHistory: '++id, query',
    })
  }
}

export const database = new OmnisearchCache()
