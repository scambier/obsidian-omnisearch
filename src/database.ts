import Dexie from 'dexie'
import type { AsPlainObject } from 'minisearch'
import type { DocumentRef } from './globals'
import { Notice } from 'obsidian'
import type OmnisearchPlugin from './main'

export class Database extends Dexie {
  public static readonly dbVersion = 9
  searchHistory!: Dexie.Table<{ id?: number; query: string }, number>
  minisearch!: Dexie.Table<
    {
      date: string
      paths: DocumentRef[]
      data: AsPlainObject
    },
    string
  >
  embeds!: Dexie.Table<{ path: string; embeds: string[] }, string>

  constructor(private plugin: OmnisearchPlugin) {
    super(Database.getDbName(plugin.app.appId))
    // Database structure
    this.version(Database.dbVersion).stores({
      searchHistory: '++id',
      minisearch: 'date',
      embeds: 'path',
    })
  }

  private static getDbName(appId: string) {
    return 'omnisearch/cache/' + appId
  }

  //#endregion Table declarations

  public async getMinisearchCache(): Promise<{
    paths: DocumentRef[]
    data: AsPlainObject
  } | null> {
    try {
      const cachedIndex = (await this.plugin.database.minisearch.toArray())[0]
      return cachedIndex
    } catch (e) {
      new Notice(
        'Omnisearch - Cache missing or invalid. Some freezes may occur while Omnisearch indexes your vault.'
      )
      console.error('Omnisearch - Error while loading Minisearch cache')
      console.error(e)
      return null
    }
  }

  public async writeMinisearchCache(): Promise<void> {
    const minisearchJson = this.plugin.searchEngine.getSerializedMiniSearch()
    const paths = this.plugin.searchEngine.getSerializedIndexedDocuments()
    const database = this.plugin.database
    await database.minisearch.clear()
    await database.minisearch.add({
      date: new Date().toISOString(),
      paths,
      data: minisearchJson,
    })
    console.log('Omnisearch - Search cache written')
  }

  /**
   * Deletes Omnisearch databases that have an older version than the current one
   */
  public async clearOldDatabases(): Promise<void> {
    const toDelete = (await indexedDB.databases()).filter(
      db =>
        db.name === Database.getDbName(this.plugin.app.appId) &&
        // version multiplied by 10 https://github.com/dexie/Dexie.js/issues/59
        db.version !== Database.dbVersion * 10
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
    await this.minisearch.clear()
    await this.embeds.clear()
    new Notice('Omnisearch - Cache cleared. Please restart Obsidian.')
  }
}
