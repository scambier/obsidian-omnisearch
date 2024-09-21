import { getLinkpath } from 'obsidian'
import type OmnisearchPlugin from '../main'
import { logDebug } from '../tools/utils'

export class EmbedsRepository {
  /** Map<image or pdf, notes where embedded> */
  private embeds: Map<string, Set<string>> = new Map()

  constructor(private plugin: OmnisearchPlugin) {}

  public addEmbeds(notePath: string): void {
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

  public addEmbed(embed: string, notePath: string): void {
    if (!this.embeds.has(embed)) {
      this.embeds.set(embed, new Set())
    }
    this.embeds.get(embed)!.add(notePath)
  }

  public getEmbeds(pathEmbedded: string): string[] {
    const embeds = this.embeds.has(pathEmbedded)
      ? [...this.embeds.get(pathEmbedded)!]
      : []
    return embeds
  }

  public removeEmbed(embed: string): void {
    this.embeds.delete(embed)
  }

  public async writeToCache(): Promise<void> {
    logDebug('Writing embeds to cache')
    const database = this.plugin.database
    const data: { path: string; embeds: string[] }[] = []
    for (const [path, embedsList] of this.embeds) {
      data.push({ path, embeds: [...embedsList] })
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
    for (const { path, embeds } of embedsArr) {
      for (const embed of embeds) {
        this.addEmbed(embed, path)
      }
    }
  }
}
