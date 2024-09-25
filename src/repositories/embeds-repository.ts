import { getLinkpath } from 'obsidian'
import type OmnisearchPlugin from '../main'
import { logDebug } from '../tools/utils'

export class EmbedsRepository {
  /** Map<image or pdf, notes where embedded> */
  private embeds: Map<string, Set<string>> = new Map()

  constructor(private plugin: OmnisearchPlugin) {}

  public addEmbed(embed: string, notePath: string): void {
    if (!this.embeds.has(embed)) {
      this.embeds.set(embed, new Set())
    }
    this.embeds.get(embed)!.add(notePath)
  }

  public refreshEmbeds(notePath: string): void {
    this.embeds.forEach((value, key) => {
      if (value.has(notePath)) {
        value.delete(notePath)
      }
    })
    this.addEmbeds(notePath)
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
    const data: { embedded: string; references: string[] }[] = []
    for (const [path, embedsList] of this.embeds) {
      data.push({ embedded: path, references: [...embedsList] })
    }
    await database.embeds.clear()
    await database.embeds.bulkAdd(data)
  }

  public async loadFromCache(): Promise<void> {
    const database = this.plugin.database
    if (!database.embeds) {
      logDebug('No embeds in cache')
      return
    }
    logDebug('Loading embeds from cache')
    const embedsArr = await database.embeds.toArray()
    for (const { embedded: path, references: embeds } of embedsArr) {
      for (const embed of embeds) {
        this.addEmbed(path, embed)
      }
    }
  }

  private addEmbeds(notePath: string): void {
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
      this.addEmbed(embed.path, notePath)
    }
  }
}
