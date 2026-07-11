import MiniSearch, { type QueryCombination } from 'minisearch'
import {
  HAN_GRAM_FIELDS,
  ORIGINAL_SEARCH_FIELDS,
  createHanQueryPlan,
  documentContainsHanRuns,
  getSourceFieldForHanGram,
  isHanGramField,
  tokenizeHanGramTerms,
} from '../search/han-grams'

type TestDocument = Record<(typeof ORIGINAL_SEARCH_FIELDS)[number], string> & {
  id: string
}

const makeDocument = (
  id: string,
  content: string,
  overrides: Partial<TestDocument> = {}
): TestDocument => ({
  id,
  basename: id,
  directory: '',
  aliases: '',
  content,
  headings1: '',
  headings2: '',
  headings3: '',
  ...overrides,
})

const createSearch = (documents: TestDocument[], withHanFields = true) => {
  const fields = withHanFields
    ? [...ORIGINAL_SEARCH_FIELDS, ...HAN_GRAM_FIELDS]
    : [...ORIGINAL_SEARCH_FIELDS]
  const miniSearch = new MiniSearch<TestDocument>({
    idField: 'id',
    fields,
    extractField(document, field) {
      const source = isHanGramField(field)
        ? getSourceFieldForHanGram(field)
        : field
      return document[source as keyof TestDocument]
    },
    tokenize(text, field) {
      return field && isHanGramField(field)
        ? tokenizeHanGramTerms(text)
        : text.split(/\s+/).filter(Boolean)
    },
    processTerm: term => term.toLowerCase(),
  })
  miniSearch.addAll(documents)
  return miniSearch
}

const searchOptions = {
  fields: [...ORIGINAL_SEARCH_FIELDS],
  tokenize: (text: string) => [text],
  processTerm: (term: string) => term.toLowerCase(),
  prefix: true,
  fuzzy: false,
}

const fallbackQuery = (text: string): QueryCombination => {
  const plan = createHanQueryPlan(text)
  if (!plan) throw new Error(`Missing Han query plan for ${text}`)

  const queries: QueryCombination['queries'] = [
    {
      combineWith: 'AND',
      queries: plan.grams,
      fields: HAN_GRAM_FIELDS,
      prefix: false,
      fuzzy: false,
    },
  ]
  const remaining = plan.remainingText.trim()
  if (remaining) queries.unshift(remaining)
  return { combineWith: 'AND', queries }
}

describe('Han fallback with MiniSearch', () => {
  it('recalls an internal Han bigram while preserving a Latin constraint', () => {
    const miniSearch = createSearch([
      makeDocument('a', 'projectA 周五的时候'),
      makeDocument('b', 'projectB 周五的时候'),
    ])

    expect(miniSearch.search('时候', searchOptions)).toHaveLength(0)
    expect(
      miniSearch
        .search(fallbackQuery('projectA 时候'), searchOptions)
        .map(result => String(result.id))
    ).toEqual(['a'])
  })

  it('keeps ordinary field scores unchanged when Han fields are present', () => {
    const documents = [
      makeDocument('han', 'foo 周五的时候'),
      makeDocument('latin', 'foo ordinary'),
    ]
    const baseline = createSearch(documents, false).search('foo', searchOptions)
    const patched = createSearch(documents).search('foo', searchOptions)

    expect(patched.map(result => [String(result.id), result.score])).toEqual(
      baseline.map(result => [String(result.id), result.score])
    )
  })

  it('treats multi-gram matches as candidates and rejects cross-field joins', () => {
    const documents = [
      makeDocument('true', '前甲乙丙后'),
      makeDocument('cross-field', '乙丙', { basename: '甲乙' }),
    ]
    const miniSearch = createSearch(documents)
    const candidates = miniSearch.search(fallbackQuery('甲乙丙'), searchOptions)
    const verified = candidates.filter(result => {
      const document = documents.find(item => item.id === String(result.id))!
      return documentContainsHanRuns(
        ['甲乙丙'],
        ORIGINAL_SEARCH_FIELDS.map(field => document[field])
      )
    })

    expect(candidates.map(result => String(result.id)).sort()).toEqual([
      'cross-field',
      'true',
    ])
    expect(verified.map(result => String(result.id))).toEqual(['true'])
  })
})
