import type OmnisearchPlugin from '../main'
import { logDebug } from "../tools/utils";

export class EmbedsRepository {
  /** Map<image or pdf, notes where embedded> */
  private embeds: Map<string, string[]> = new Map()

  constructor(private plugin: OmnisearchPlugin) {}

  public addEmbeds(notePath: string): void {
    const embeds = this.plugin.app.metadataCache.getCache(notePath)?.embeds ?? []
    for (const embed of embeds) {
      this.addEmbed(embed.link, notePath)
    }
  }

  public addEmbed(embed: string, notePath: string): void {
    if (!this.embeds.has(embed)) {
      this.embeds.set(embed, [])
    }
    this.embeds.get(embed)!.push(notePath)
  }

  public getEmbeds(embed: string): string[] {
    return this.embeds.get(embed) ?? []
  }

  public removeEmbed(embed: string): void {
    this.embeds.delete(embed)
  }

  public async writeToCache(): Promise<void> {
    logDebug('Writing embeds to cache')
    const database = this.plugin.database
    const data: { path: string; embeds: string[] }[] = []
    for (const [path, embedsList] of this.embeds) {
      data.push({ path, embeds: embedsList })
    }
    await database.embeds.clear()
    await database.embeds.bulkAdd(data)
  }

  public async loadFromCache(): Promise<void> {
    logDebug('Loading embeds from cache')
    const database = this.plugin.database
    if (!database.embeds) {
      logDebug('No embeds in cache')
      return
    }
    const embedsArr = await database.embeds.toArray()
    for (const { path, embeds } of embedsArr) {
      this.embeds.set(path, embeds)
    }
  }
}
