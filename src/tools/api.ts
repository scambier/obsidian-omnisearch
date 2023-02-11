import type { ResultNote } from '../globals'
import { Query } from '../search/query'
import { searchEngine } from '../search/omnisearch'
import { makeExcerpt } from './utils'
import { refreshIndex } from '../notes-index'

type ResultNoteApi = {
  score: number
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

function mapResults(results: ResultNote[]): ResultNoteApi[] {
  return results.map(result => {
    const { score, path, basename, foundWords, matches, content } = result

    const excerpt = makeExcerpt(content, matches[0]?.offset ?? -1)

    return {
      score,
      path,
      basename,
      foundWords,
      matches: matches.map(match => {
        return {
          match: match.match,
          offset: match.offset,
        }
      }),
      excerpt,
    }
  })
}

async function search(q: string): Promise<ResultNoteApi[]> {
  const query = new Query(q)
  const raw = await searchEngine.getSuggestions(query)
  return mapResults(raw)
}

function registerOnIndexed(cb: () => void): void {
  onIndexedCallbacks.push(cb)
  // Immediately call the callback if the indexing is already ready done
  if (notified) {
    cb()
  }
}

function unregisterOnIndexed(cb: () => void): void {
  onIndexedCallbacks = onIndexedCallbacks.filter(o => o !== cb)
}

export function notifyOnIndexed(): void {
  notified = true
  onIndexedCallbacks.forEach(cb => cb())
}

export default { search, registerOnIndexed, unregisterOnIndexed, refreshIndex }
