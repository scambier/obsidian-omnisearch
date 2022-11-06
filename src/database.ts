import Dexie from 'dexie'
import type { AsPlainObject } from 'minisearch'
import type { IndexedDocument } from './globals'

export class OmnisearchCache extends Dexie {
  public static readonly dbVersion = 7
  public static readonly dbName = 'omnisearch/cache/' + app.appId

  private static instance: OmnisearchCache

  /**
   * Deletes Omnisearch databases that have an older version than the current one
   */
  public static async clearOldDatabases(): Promise<void> {
    const toDelete = (await indexedDB.databases()).filter(
      db =>
        db.name === OmnisearchCache.dbName &&
        // version multiplied by 10 https://github.com/dexie/Dexie.js/issues/59
        db.version !== OmnisearchCache.dbVersion * 10
    )
    if (toDelete.length) {
      console.log('Omnisearch - Those IndexedDb databases will be deleted:')
      for (const db of toDelete) {
        if (db.name) {
          console.log(db.name + ' ' + db.version)
          indexedDB.deleteDatabase(db.name)
        }
      }
    }
  }

  //#region Table declarations

  documents!: Dexie.Table<
    { path: string; mtime: number; document: IndexedDocument },
    string
  >
  searchHistory!: Dexie.Table<{ id?: number; query: string }, number>
  minisearch!: Dexie.Table<
    { date: string; checksum: string; data: AsPlainObject },
    string
  >

  //#endregion Table declarations

  public static getInstance() {
    if (!OmnisearchCache.instance) {
      OmnisearchCache.instance = new OmnisearchCache()
    }
    return OmnisearchCache.instance
  }

  private constructor() {
    super(OmnisearchCache.dbName)
    // Database structure
    this.version(OmnisearchCache.dbVersion).stores({
      searchHistory: '++id',
      documents: 'path',
      minisearch: 'date',
    })
  }

  public async clearCache() {
    await this.minisearch.clear()
    await this.documents.clear()
  }
}

export const database = OmnisearchCache.getInstance()
