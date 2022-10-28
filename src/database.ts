import Dexie from 'dexie'

class OmnisearchCache extends Dexie {
  pdf!: Dexie.Table<
    { path: string; hash: string; size: number; text: string },
    string
  >
  searchHistory!: Dexie.Table<{ id?: number; query: string }, number>
  minisearch!: Dexie.Table<{ date: string; data: string }, string>

  constructor() {
    super('omnisearch/cache/' + app.appId)
    this.version(5).stores({
      pdf: 'path, hash, size',
      searchHistory: '++id',
      minisearch: 'date',
    })
  }
}

export const database = new OmnisearchCache()
