import { historyFilePath } from './globals'

export let searchHistory: string[] = []

export async function loadSearchHistory(): Promise<void> {
  if (await app.vault.adapter.exists(historyFilePath)) {
    try {
      searchHistory = JSON.parse(await app.vault.adapter.read(historyFilePath))
      // Keep the last 100 searches
      searchHistory = searchHistory.slice(0, 100)
    } catch (e) {
      console.trace('Could not load search history from the file')
      console.error(e)
      searchHistory = []
    }
  } else {
    searchHistory = []
  }
}

export async function saveSearchHistory(): Promise<void> {
  await app.vault.adapter.write(historyFilePath, JSON.stringify(searchHistory))
}
