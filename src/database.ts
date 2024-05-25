import Dexie from 'dexie'
import type { AsPlainObject } from 'minisearch'
import type { DocumentRef } from './globals'
import { Notice } from 'obsidian'
import type OmnisearchPlugin from './main'

export class OmnisearchCache extends Dexie {
  public static readonly dbVersion = 8
  searchHistory!: Dexie.Table<{ id?: number; query: string }, number>
  minisearch!: Dexie.Table<
    {
      date: string
      paths: DocumentRef[]
      data: AsPlainObject
    },
    string
  >

  constructor(private plugin: OmnisearchPlugin) {
    super(OmnisearchCache.getDbName(plugin.app.appId))
    // Database structure
    this.version(OmnisearchCache.dbVersion).stores({
      searchHistory: '++id',
      minisearch: 'date',
    })
  }

  public static getDbName(appId: string) {
    return 'omnisearch/cache/' + appId
  }

  //#endregion Table declarations

  /**
   * Deletes Omnisearch databases that have an older version than the current one
   */
  public async clearOldDatabases(): Promise<void> {
    const toDelete = (await indexedDB.databases()).filter(
      db =>
        db.name === OmnisearchCache.getDbName(this.plugin.app.appId) &&
        // version multiplied by 10 https://github.com/dexie/Dexie.js/issues/59
        db.version !== OmnisearchCache.dbVersion * 10
    )
    if (toDelete.length) {
      console.log('Omnisearch - Those IndexedDb databases will be deleted:')
      for (const db of toDelete) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name)
        }
      }
    }
  }

  public async clearCache() {
    new Notice('Omnisearch - Cache cleared. Please restart Obsidian.')
    await this.minisearch.clear()
  }
}
