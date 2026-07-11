export const HAN_NORMALIZATION = 'none' as const
// Keep synthetic terms outside the namespace used by natural prefix searches.
export const HAN_GRAM_PREFIX = '\uE000han:'

export const ORIGINAL_SEARCH_FIELDS = [
  'basename',
  'directory',
  'aliases',
  'content',
  'headings1',
  'headings2',
  'headings3',
] as const

export type OriginalSearchField = (typeof ORIGINAL_SEARCH_FIELDS)[number]

export const HAN_GRAM_FIELD_BY_SOURCE = {
  basename: 'hanGramsBasename',
  directory: 'hanGramsDirectory',
  aliases: 'hanGramsAliases',
  content: 'hanGramsContent',
  headings1: 'hanGramsHeadings1',
  headings2: 'hanGramsHeadings2',
  headings3: 'hanGramsHeadings3',
} as const satisfies Record<OriginalSearchField, string>

export type HanGramField =
  (typeof HAN_GRAM_FIELD_BY_SOURCE)[OriginalSearchField]

export const HAN_GRAM_FIELDS = Object.values(
  HAN_GRAM_FIELD_BY_SOURCE
) as HanGramField[]

const SOURCE_FIELD_BY_HAN_GRAM = Object.fromEntries(
  Object.entries(HAN_GRAM_FIELD_BY_SOURCE).map(([source, gramField]) => [
    gramField,
    source,
  ])
) as Record<HanGramField, OriginalSearchField>

export const isHanGramField = (field: string): field is HanGramField =>
  field in SOURCE_FIELD_BY_HAN_GRAM

export const getSourceFieldForHanGram = (
  field: HanGramField
): OriginalSearchField => SOURCE_FIELD_BY_HAN_GRAM[field]

export const HAN_INDEX_SCHEMA_VERSION = 1

export type IndexSignatureOptions = {
  tokenizeUrls: boolean
  ignoreDiacritics: boolean
  ignoreArabicDiacritics: boolean
  chsPatch: string
}

export const createIndexSignature = (options: IndexSignatureOptions): string =>
  JSON.stringify({
    version: HAN_INDEX_SCHEMA_VERSION,
    normalization: HAN_NORMALIZATION,
    hanPolicy:
      'Script=Han&General_Category=Letter|Mark|Number;marked-bigram;no-unigram',
    gramMarker: HAN_GRAM_PREFIX,
    originalFields: ORIGINAL_SEARCH_FIELDS,
    gramFields: HAN_GRAM_FIELD_BY_SOURCE,
    options,
  })

export type HanQueryPlan = {
  runs: string[]
  grams: string[]
  remainingText: string
}

type TextSegment = {
  value: string
  isHan: boolean
}

const HAN_SCRIPT = /\p{Script=Han}/u
const LETTER_MARK_OR_NUMBER = /[\p{Letter}\p{Mark}\p{Number}]/u
const WORD_CHARACTER = /[\p{Letter}\p{Number}\p{Mark}]/u

const normalize = (input: string): string => input

export const isHanIndexCharacter = (character: string): boolean =>
  HAN_SCRIPT.test(character) && LETTER_MARK_OR_NUMBER.test(character)

const segmentText = (input: string): TextSegment[] => {
  const segments: TextSegment[] = []
  for (const character of input) {
    const isHan = isHanIndexCharacter(character)
    const previous = segments[segments.length - 1]
    if (previous?.isHan === isHan) {
      previous.value += character
    } else {
      segments.push({ value: character, isHan })
    }
  }
  return segments
}

const firstCharacter = (input: string): string => Array.from(input)[0] ?? ''

const lastCharacter = (input: string): string => {
  const characters = Array.from(input)
  return characters[characters.length - 1] ?? ''
}

const isAttachedToNonHanWord = (
  segments: TextSegment[],
  index: number
): boolean => {
  const previous = lastCharacter(segments[index - 1]?.value ?? '')
  const next = firstCharacter(segments[index + 1]?.value ?? '')
  return WORD_CHARACTER.test(previous) || WORD_CHARACTER.test(next)
}

export const extractHanRuns = (input: string): string[] =>
  segmentText(input)
    .filter(segment => segment.isHan)
    .map(segment => normalize(segment.value))

export const tokenizeHanBigrams = (input: string): string[] => {
  const grams: string[] = []
  let previousHan = ''
  for (const character of input) {
    if (!isHanIndexCharacter(character)) {
      previousHan = ''
      continue
    }
    if (previousHan) grams.push(previousHan + character)
    previousHan = character
  }
  return grams
}

export const markHanGram = (gram: string): string => HAN_GRAM_PREFIX + gram

export const tokenizeHanGramTerms = (input: string): string[] =>
  tokenizeHanBigrams(input).map(markHanGram)

export const createHanQueryPlan = (input: string): HanQueryPlan | null => {
  const segments = segmentText(input)
  const eligibleIndexes = segments
    .map((segment, index) => ({ segment, index }))
    .filter(
      ({ segment, index }) =>
        segment.isHan &&
        Array.from(segment.value).length > 1 &&
        !isAttachedToNonHanWord(segments, index)
    )
    .map(({ index }) => index)

  if (!eligibleIndexes.length) return null

  const eligible = new Set(eligibleIndexes)
  const runs = eligibleIndexes.map(index => normalize(segments[index].value))
  return {
    runs,
    grams: [...new Set(runs.flatMap(tokenizeHanGramTerms))],
    remainingText: segments
      .map((segment, index) =>
        eligible.has(index)
          ? ' '.repeat(Array.from(segment.value).length)
          : segment.value
      )
      .join(''),
  }
}

export const documentContainsHanRuns = (
  runs: string[],
  fieldValues: readonly string[]
): boolean => {
  const normalizedFields = fieldValues.map(normalize)
  return runs
    .map(normalize)
    .every(run => normalizedFields.some(fieldValue => fieldValue.includes(run)))
}

export const requiresHanVerification = (runs: string[]): boolean =>
  runs.some(run => Array.from(run).length > 2)

type RankedResult = {
  id: string
  score: number
}

export const reconcileVerifiedHanResults = <T extends RankedResult>(
  naturalResults: T[],
  combinedResults: T[],
  verifiedFallbackIds: ReadonlySet<string>
): T[] => {
  const naturalById = new Map(naturalResults.map(result => [result.id, result]))
  return combinedResults
    .flatMap(result => {
      if (verifiedFallbackIds.has(result.id)) return [result]
      const naturalResult = naturalById.get(result.id)
      return naturalResult ? [naturalResult] : []
    })
    .sort((a, b) => b.score - a.score)
}
