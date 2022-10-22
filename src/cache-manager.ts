import type { TFile } from 'obsidian'
import type { IndexedDocument } from './globals'

class CacheManager {
  private documentsCache: Map<string, IndexedDocument> = new Map()
  private writeInterval = 10_000 // In milliseconds

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

  // private async _writeMinisearchIndex(minisearch: MiniSearch): Promise<void> {
  //   if (!settings.persistCache) {
  //     return
  //   }
  //   const json = JSON.stringify(minisearch)
  //   const data = deflate(json)
  //   await app.vault.adapter.writeBinary(minisearchCacheFilePath, data as any)
  //   console.log('Omnisearch - Minisearch index saved on disk')
  // }
  //
  // private async _saveNotesCache() {
  //   if (!settings.persistCache) {
  //     return
  //   }
  //   const json = JSON.stringify(Array.from(this.documentsCache.entries()))
  //   const data = deflate(json)
  //   await app.vault.adapter.writeBinary(notesCacheFilePath, data as any)
  //   console.log('Omnisearch - Notes cache saved on disk')
  // }
}

export const cacheManager = new CacheManager()
