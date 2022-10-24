import type { TFile } from 'obsidian'
import type { IndexedDocument } from './globals'
import { database } from './database'

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

}

export const cacheManager = new CacheManager()
