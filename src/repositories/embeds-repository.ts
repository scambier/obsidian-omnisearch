import { getLinkpath, Notice } from 'obsidian'
import type OmnisearchPlugin from '../main'
import { logDebug } from '../tools/utils'

export class EmbedsRepository {
  /** Map<embedded file, notes where the embed is referenced> */
  private embeds: Map<string, Set<string>> = new Map()

  constructor(private plugin: OmnisearchPlugin) {}

  public addEmbed(embed: string, notePath: string): void {
    if (!this.embeds.has(embed)) {
      this.embeds.set(embed, new Set())
    }
    this.embeds.get(embed)!.add(notePath)
  }

  public removeFile(filePath: string): void {
    // If the file is embedded
    this.embeds.delete(filePath)
    // If the file is a note referencing other files
    this.refreshEmbedsForNote(filePath)
  }

  public renameFile(oldPath: string, newPath: string): void {
    // If the file is embedded
    if (this.embeds.has(oldPath)) {
      this.embeds.set(newPath, this.embeds.get(oldPath)!)
      this.embeds.delete(oldPath)
    }
    // If the file is a note referencing other files
    this.embeds.forEach((referencedBy, _key) => {
      if (referencedBy.has(oldPath)) {
        referencedBy.delete(oldPath)
        referencedBy.add(newPath)
      }
    })
  }

  public refreshEmbedsForNote(filePath: string): void {
    this.embeds.forEach((referencedBy, _key) => {
      if (referencedBy.has(filePath)) {
        referencedBy.delete(filePath)
      }
    })

    this.addEmbedsForNote(filePath)
  }

  public getEmbeds(pathEmbedded: string): string[] {
    const embeds = this.embeds.has(pathEmbedded)
      ? [...this.embeds.get(pathEmbedded)!]
      : []
    return embeds
  }

  public async writeToCache(): Promise<void> {
    logDebug('Writing embeds to cache')
    const database = this.plugin.database
    const data: { embedded: string; referencedBy: string[] }[] = []
    for (const [path, embedsList] of this.embeds) {
      data.push({ embedded: path, referencedBy: [...embedsList] })
    }
    await database.embeds.clear()
    await database.embeds.bulkAdd(data)
  }

  public async loadFromCache(): Promise<void> {
    try {
      const database = this.plugin.database
      if (!database.embeds) {
        logDebug('No embeds in cache')
        return
      }
      logDebug('Loading embeds from cache')
      const embedsArr = await database.embeds.toArray()
      for (const { embedded: path, referencedBy: embeds } of embedsArr) {
        for (const embed of embeds) {
          this.addEmbed(path, embed)
        }
      }
    } catch (e) {
      this.plugin.database.clearCache()
      console.error('Omnisearch - Error while loading embeds cache')
      new Notice('Omnisearch - There was an error while loading the cache. Please restart Obsidian.')
    }
  }

  private addEmbedsForNote(notePath: string): void {
    // Get all embeds from the note
    // and map them to TFiles to get the real path
    const embeds = (
      this.plugin.app.metadataCache.getCache(notePath)?.embeds ?? []
    )
      .map(embed =>
        this.plugin.app.metadataCache.getFirstLinkpathDest(
          getLinkpath(embed.link),
          notePath
        )
      )
      .filter(o => !!o)
    for (const embed of embeds) {
      this.addEmbed(embed!.path, notePath)
    }
  }
}
