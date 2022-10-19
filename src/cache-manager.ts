import { throttle } from 'lodash-es'
import type MiniSearch from 'minisearch'
import type { TFile } from 'obsidian'
import { deflate, inflate } from 'pako'
import {
  notesCacheFilePath,
  minisearchCacheFilePath,
  type IndexedDocument,
} from './globals'
import { settings } from './settings'

class CacheManager {
  notesCache: Record<string, IndexedDocument> = {}
  compress = true
  writeInterval = 5_000 // In milliseconds

  //#region Minisearch

  /**
   * Serializes and writes the Minisearch index on the disk
   */
  public writeMinisearchIndex = throttle(
    this._writeMinisearchIndex,
    this.writeInterval,
    {
      leading: true,
      trailing: true,
    }
  )
  private async _writeMinisearchIndex(minisearch: MiniSearch): Promise<void> {
    if (!settings.persistCache) {
      return
    }
    const json = JSON.stringify(minisearch)
    const data = this.compress ? deflate(json) : json
    await app.vault.adapter.writeBinary(minisearchCacheFilePath, data as any)
    console.log('Omnisearch - Minisearch index saved on disk')
  }

  public async readMinisearchIndex(): Promise<string | null> {
    if (!settings.persistCache) {
      return null
    }
    if (await app.vault.adapter.exists(minisearchCacheFilePath)) {
      try {
        const data = await app.vault.adapter.readBinary(minisearchCacheFilePath)
        return (
          this.compress ? new TextDecoder('utf8').decode(inflate(data)) : data
        ) as any
      } catch (e) {
        console.trace(
          'Omnisearch - Could not load MiniSearch index from the file:'
        )
        console.warn(e)
        app.vault.adapter.remove(minisearchCacheFilePath)
      }
    }
    return null
  }

  //#endregion Minisearch

  public async loadNotesCache() {
    if (!settings.persistCache) {
      return null
    }
    if (await app.vault.adapter.exists(notesCacheFilePath)) {
      try {
        const data = await app.vault.adapter.readBinary(notesCacheFilePath)
        const json = (
          this.compress ? new TextDecoder('utf8').decode(inflate(data)) : data
        ) as any
        this.notesCache = JSON.parse(json)
      } catch (e) {
        console.trace('Omnisearch - Could not load notes cache:')
        console.warn(e)
        app.vault.adapter.remove(notesCacheFilePath)
      }
    }
    return null
  }

  public saveNotesCache = throttle(this._saveNotesCache, this.writeInterval, {
    leading: true,
    trailing: true,
  })
  private async _saveNotesCache() {
    if (!settings.persistCache) {
      return
    }
    const json = JSON.stringify(this.notesCache)
    const data = this.compress ? deflate(json) : json
    await app.vault.adapter.writeBinary(notesCacheFilePath, data as any)
    console.log('Omnisearch - Notes cache saved on disk')
  }

  public addNoteToMemCache(path: string, note: IndexedDocument) {
    this.notesCache[path] = note
    this.saveNotesCache()
  }

  public removeNoteFromMemCache(key: string): void {
    delete this.notesCache[key]
  }

  public getNoteFromMemCache(key: string): IndexedDocument | undefined {
    return this.notesCache[key]
  }

  public getNonExistingNotesFromMemCache(): IndexedDocument[] {
    return Object.values(this.notesCache).filter(note => note.doesNotExist)
  }

  public isNoteInMemCacheOutdated(file: TFile): boolean {
    const indexedNote = this.getNoteFromMemCache(file.path)
    return !indexedNote || indexedNote.mtime !== file.stat.mtime
  }
}

export const cacheManager = new CacheManager()
