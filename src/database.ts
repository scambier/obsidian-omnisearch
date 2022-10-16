import Dexie from 'dexie'

class OmnisearchCache extends Dexie {
  pdf!: Dexie.Table<
    { path: string; hash: string; size: number; text: string },
    string
  >

  constructor() {
    super(app.appId + '_omnisearch')
    this.version(1).stores({
      pdf: 'path, hash, size, text',
    })
  }
}

export const database = new OmnisearchCache()
