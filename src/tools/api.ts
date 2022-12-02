import type { ResultNote } from '../globals'
import { SearchQuery } from '../search/query'
import { searchEngine } from '../search/omnisearch'

type ResultNoteApi = {
  score: number
  path: string
  basename: string
  foundWords: string[]
  matches: SearchMatchApi[]
}

export type SearchMatchApi = {
  match: string
  offset: number
}

function mapResults(results: ResultNote[]): ResultNoteApi[] {
  return results.map(result => {
    const { score, path, basename, foundWords, matches } = result
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
    }
  })
}

async function search(q: string): Promise<ResultNoteApi[]> {
  const query = new SearchQuery(q)
  const raw = await searchEngine.getSuggestions(query)
  return mapResults(raw)
}

export default {search}
