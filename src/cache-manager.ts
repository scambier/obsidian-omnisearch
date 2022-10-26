import type { TFile } from 'obsidian'
import type { IndexedDocument } from './globals'
import { database } from './database'
import MiniSearch from 'minisearch'
import { minisearchOptions } from './search/search-engine'
import { fileToIndexedDocument } from './file-loader'

class CacheManager {
  private documentsCache: Map<string, IndexedDocument> = new Map()
  /**
   * Show an empty input field next time the user opens Omnisearch modal
   */
  private nextQueryIsEmpty = false

  public async addToSearchHistory(query: string): Promise<void> {
    if (!query) {
      this.nextQueryIsEmpty = true
      return
    }
    this.nextQueryIsEmpty = false
    let history = await database.searchHistory.toArray()
    history = history.filter(s => s.query !== query).reverse()
    history.unshift({ query })
    history = history.slice(0, 10)
    await database.searchHistory.clear()
    await database.searchHistory.bulkAdd(history)
  }

  public async getSearchHistory(): Promise<ReadonlyArray<string>> {
    const data = (await database.searchHistory.toArray())
      .reverse()
      .map(o => o.query)
    if (this.nextQueryIsEmpty) {
      data.unshift('')
    }
    return data
  }

  public async updateDocument(path: string, note: IndexedDocument) {
    this.documentsCache.set(path, note)
  }

  public deleteDocument(key: string): void {
    this.documentsCache.delete(key)
  }

  public getDocument(key: string): IndexedDocument | undefined {
    return this.documentsCache.get(key)
  }

  public getNonExistingNotesFromMemCache(): IndexedDocument[] {
    return Object.values(this.documentsCache).filter(note => note.doesNotExist)
  }

  public isDocumentOutdated(file: TFile): boolean {
    const indexedNote = this.getDocument(file.path)
    return !indexedNote || indexedNote.mtime !== file.stat.mtime
  }

  //#region Minisearch

  public async getMinisearchCache(): Promise<MiniSearch | null> {
    const cache = (await database.minisearch.toArray())[0]
    if (!cache) {
      return null
    }
    try {
      return MiniSearch.loadJSON(cache.data, minisearchOptions)
    } catch (e) {
      console.error('Omnisearch - Error while loading Minisearch cache')
      console.error(e)
      return null
    }
  }

  public async writeMinisearchCache(minisearch: MiniSearch): Promise<void> {
    await database.minisearch.clear()
    await database.minisearch.add({
      date: new Date().toISOString(),
      data: JSON.stringify(minisearch.toJSON()),
    })
    console.log('Omnisearch - Search cache written')
  }

  //#endregion Minisearch
}

export const cacheManager = new CacheManager()
