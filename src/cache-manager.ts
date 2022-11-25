import { Notice, type TFile } from 'obsidian'
import type { IndexedDocument } from './globals'
import { database } from './database'
import MiniSearch from 'minisearch'
import { minisearchOptions } from './search/search-engine'
import { makeMD5 } from './tools/utils'

class CacheManager {
  /**
   * @deprecated
   * @private
   */
  private liveDocuments: Map<string, IndexedDocument> = new Map()
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

  /**
   * Important: keep this method async for the day it _really_ becomes async.
   * This will avoid a refactor.
   * @deprecated
   * @param path
   * @param note
   */
  public async updateLiveDocument(
    path: string,
    note: IndexedDocument
  ): Promise<void> {
    this.liveDocuments.set(path, note)
  }

  /**
   * @deprecated
   * @param key
   */
  public deleteLiveDocument(key: string): void {
    this.liveDocuments.delete(key)
  }

  /**
   * @deprecated
   * @param key
   */
  public getLiveDocument(key: string): IndexedDocument | undefined {
    return this.liveDocuments.get(key)
  }

  //#region Minisearch

  public getDocumentsChecksum(documents: IndexedDocument[]): string {
    return makeMD5(
      JSON.stringify(
        documents.sort((a, b) => {
          if (a.path < b.path) {
            return -1
          } else if (a.path > b.path) {
            return 1
          }
          return 0
        })
      )
    )
  }

  public async getMinisearchCache(): Promise<MiniSearch | null> {
    // Retrieve documents and make their checksum
    const cachedDocs = await database.documents.toArray()

    // Add those documents in the live cache
    cachedDocs.forEach(doc =>
      cacheManager.updateLiveDocument(doc.path, doc.document)
    )

    // Retrieve the search cache, and verify the checksum
    const cachedIndex = (await database.minisearch.toArray())[0]

    try {
      return MiniSearch.loadJS(cachedIndex.data, minisearchOptions)
    } catch (e) {
      new Notice(
        'Omnisearch - Cache missing or invalid. Some freezes may occur while Omnisearch indexes your vault.'
      )
      console.error('Omnisearch - Error while loading Minisearch cache')
      console.error(e)
      return null
    }
  }

  /**
   * Get a dict listing the deleted/added documents since last cache
   * @param documents
   */
  public async getDiffDocuments(documents: IndexedDocument[]): Promise<{
    toDelete: string[]
    toAdd: IndexedDocument[]
    toUpdate: { oldDoc: IndexedDocument; newDoc: IndexedDocument }[]
  }> {
    let cachedDocs = await database.documents.toArray()
    // present in `documents` but not in `cachedDocs`
    const toAdd = documents.filter(
      d => !cachedDocs.find(c => c.path === d.path)
    )
    // present in `cachedDocs` but not in `documents`
    const toDelete = cachedDocs
      .filter(c => !documents.find(d => d.path === c.path))
      .map(d => d.path)

    // toUpdate: same path, but different mtime
    const toUpdate = cachedDocs
      .filter(({ mtime: cMtime, path: cPath }) =>
        documents.some(
          ({ mtime: dMtime, path: dPath }) =>
            cPath === dPath && dMtime !== cMtime
        )
      )
      .map(c => ({
        oldDoc: c.document,
        newDoc: documents.find(d => d.path === c.path)!,
      }))

    return {
      toAdd,
      toDelete,
      toUpdate,
    }
  }

  public async writeMinisearchCache(
    minisearch: MiniSearch,
    documents: IndexedDocument[]
  ): Promise<void> {
    const { toDelete, toAdd, toUpdate } = await this.getDiffDocuments(documents)

    // Delete
    // console.log(`Omnisearch - Cache - Will delete ${toDelete.length} documents`)
    await database.documents.bulkDelete(toDelete)

    // Add
    // console.log(`Omnisearch - Cache - Will add ${toAdd.length} documents`)
    await database.documents.bulkAdd(
      toAdd.map(o => ({ document: o, mtime: o.mtime, path: o.path }))
    )

    // Update
    // console.log(`Omnisearch - Cache - Will update ${toUpdate.length} documents`)
    await database.documents.bulkPut(
      toUpdate.map(o => ({
        document: o.newDoc,
        mtime: o.newDoc.mtime,
        path: o.newDoc.path,
      }))
    )

    await database.minisearch.clear()
    await database.minisearch.add({
      date: new Date().toISOString(),
      checksum: this.getDocumentsChecksum(documents),
      data: minisearch.toJSON(),
    })
    console.log('Omnisearch - Search cache written')
  }

  //#endregion Minisearch
}

export const cacheManager = new CacheManager()
