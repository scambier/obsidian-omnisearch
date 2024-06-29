import type { ResultNote } from '../globals'
import { Query } from '../search/query'
import type OmnisearchPlugin from '../main'
import { OmnisearchVaultModal } from '../components/modals'

type ResultNoteApi = {
  score: number
  vault: string
  path: string
  basename: string
  foundWords: string[]
  matches: SearchMatchApi[]
  excerpt: string
}

export type SearchMatchApi = {
  match: string
  offset: number
}

let notified = false

/**
 * Callbacks to be called when the search index is ready
 */
let onIndexedCallbacks: Array<() => void> = []

function mapResults(
  plugin: OmnisearchPlugin,
  results: ResultNote[]
): ResultNoteApi[] {
  return results.map(result => {
    const { score, path, basename, foundWords, matches, content } = result

    const excerpt = plugin.textProcessor.makeExcerpt(
      content,
      matches[0]?.offset ?? -1
    )

    const res: ResultNoteApi = {
      score,
      vault: plugin.app.vault.getName(),
      path,
      basename,
      foundWords,
      matches: matches.map(match => {
        return {
          match: match.match,
          offset: match.offset,
        }
      }),
      excerpt: excerpt,
    }

    return res
  })
}

export function notifyOnIndexed(): void {
  notified = true
  onIndexedCallbacks.forEach(cb => cb())
}

let registed = false

export function registerAPI(plugin: OmnisearchPlugin): void {
  if (registed) {
    return
  }
  registed = true

  // Url scheme for obsidian://omnisearch?query=foobar
  plugin.registerObsidianProtocolHandler('omnisearch', params => {
    new OmnisearchVaultModal(plugin, params.query).open()
  })

  const api = getApi(plugin)

  // Public api
  // @ts-ignore
  globalThis['omnisearch'] = api
  // Deprecated
  ;(plugin.app as any).plugins.plugins.omnisearch.api = api
}

export function getApi(plugin: OmnisearchPlugin) {
  return {
    async search(q: string): Promise<ResultNoteApi[]> {
      const query = new Query(q, {
        ignoreDiacritics: plugin.settings.ignoreDiacritics,
        ignoreArabicDiacritics: plugin.settings.ignoreArabicDiacritics,
      })
      const raw = await plugin.searchEngine.getSuggestions(query)
      return mapResults(plugin, raw)
    },
    registerOnIndexed(cb: () => void): void {
      onIndexedCallbacks.push(cb)
      // Immediately call the callback if the indexing is already ready done
      if (notified) {
        cb()
      }
    },
    unregisterOnIndexed(cb: () => void): void {
      onIndexedCallbacks = onIndexedCallbacks.filter(o => o !== cb)
    },
    refreshIndex: plugin.notesIndexer.refreshIndex,
  }
}
