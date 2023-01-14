import type { ResultNote } from '../globals'
import { Query } from '../search/query'
import { searchEngine } from '../search/omnisearch'
import { makeExcerpt } from './utils'

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

async function search(
  q: string,
  options: Partial<{ excerpt: boolean }> = {}
): Promise<ResultNoteApi[]> {
  const query = new Query(q)
  const raw = await searchEngine.getSuggestions(query)
  return mapResults(raw)
}

export default { search }
