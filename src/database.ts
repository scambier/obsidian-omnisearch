import Dexie from 'dexie'

export class OmnisearchCache extends Dexie {
  public static readonly dbVersion = 6
  public static readonly dbPrefix = 'omnisearch/cache/'
  public static readonly dbName = OmnisearchCache.dbPrefix + app.appId

  private static instance: OmnisearchCache

  /**
   * Deletes Omnisearch databases that have an older version than the current one
   */
  public static async clearOldDatabases(): Promise<void> {
    const toDelete = (await indexedDB.databases()).filter(
      db =>
        db.name?.startsWith(OmnisearchCache.dbPrefix) &&
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

  pdf!: Dexie.Table<
    { path: string; hash: string; size: number; text: string },
    string
  >
  searchHistory!: Dexie.Table<{ id?: number; query: string }, number>
  minisearch!: Dexie.Table<{ date: string; data: string }, string>

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
      pdf: 'path, hash, size',
      searchHistory: '++id',
      minisearch: 'date',
    })
  }
}

export const database = OmnisearchCache.getInstance()
