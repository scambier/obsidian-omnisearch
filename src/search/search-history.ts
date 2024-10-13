import type OmnisearchPlugin from '../main'

export class SearchHistory {
  /**
   * Show an empty input field next time the user opens Omnisearch modal
   */
  private nextQueryIsEmpty = false

  constructor(private plugin: OmnisearchPlugin) {}

  public async addToHistory(query: string): Promise<void> {
    if (!query) {
      this.nextQueryIsEmpty = true
      return
    }
    this.nextQueryIsEmpty = false
    const database = this.plugin.database
    let history = await database.searchHistory.toArray()
    history = history.filter(s => s.query !== query).reverse()
    history.unshift({ query })
    history = history.slice(0, 10)
    await database.searchHistory.clear()
    await database.searchHistory.bulkAdd(history)
  }

  /**
   * @returns The search history, in reverse chronological order
   */
  public async getHistory(): Promise<ReadonlyArray<string>> {
    const data = (await this.plugin.database.searchHistory.toArray())
      .reverse()
      .map(o => o.query)
    if (this.nextQueryIsEmpty) {
      data.unshift('')
    }
    return data
  }
}
