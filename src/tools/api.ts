import type { ResultNote, SearchMatch } from '../globals'
import { Query } from '../search/query'
import { SearchEngine } from '../search/search-engine'

type ResultNoteApi = {
  score: number
  path: string
  basename: string
  foundWords: string[]
  matches: SearchMatch[]
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
  const query = new Query(q)
  const raw = await SearchEngine.getEngine().getSuggestions(query)
  return mapResults(raw)
}

export default { search }
