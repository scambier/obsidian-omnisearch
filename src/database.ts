import Dexie from 'dexie'

class OmnisearchCache extends Dexie {
  pdf!: Dexie.Table<
    { path: string; hash: string; size: number; text: string },
    string
  >
  searchHistory!: Dexie.Table<{ id?: number; query: string }, number>
  minisearch!: Dexie.Table<{date: string; data: string}, string>

  constructor() {
    super(app.appId + '_omnisearch')
    this.version(4).stores({
      pdf: 'path, hash, size, text',
      searchHistory: '++id, query',
      minisearch: 'date, data'
    })
  }
}

export const database = new OmnisearchCache()
