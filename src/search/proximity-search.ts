import type { SearchMatch } from '../globals'

// Hebrew letter range (א-ת)
const HEBREW_LETTERS = '\u05D0-\u05EA'
// Nikud and cantillation: \u0591-\u05C7, \u05F0-\u05F4
const NIKUD_REGEX = /[\u0591-\u05C7\u05F0-\u05F4]/g

// Plus wildcard: א, ב, ה, ו, י, כ, ך, ל, מ, ם, ש, ת
const PLUS_CHARS = 'אבהויךכלםמשת'
const PLUS_CLASS = `[${PLUS_CHARS}]`

// Final-form pairs (interchangeable in matching)
const FINAL_FORMS: Record<string, string> = {
  מ: 'מם',
  ם: 'מם',
  נ: 'נן',
  ן: 'נן',
  צ: 'צץ',
  ץ: 'צץ',
  פ: 'פף',
  ף: 'פף',
  כ: 'כך',
  ך: 'כך',
}

export interface ProximityQuery {
  distance: number
  patterns: string[]
  regexes: RegExp[]
}

export interface ProximityMatchWord {
  wordIndex: number
  word: string
  charStart: number
  charEnd: number
  patternIndex: number
}

export interface ProximityMatch {
  words: ProximityMatchWord[]
  charStart: number
  charEnd: number
}

const DEFAULT_PROXIMITY_DISTANCE = 10
// N optional: @10(...) or @(...)
const PROXIMITY_QUERY_REGEX = /^@(\d*)\s*\(([^)]*)\)\s*$/
// RTL-reversed form: )N(pattern@ or )(pattern@
const PROXIMITY_QUERY_RTL_REGEX = /^\)\s*(\d*)\s*\(([^@)]*)\)?\s*@\s*$/

/**
 * Normalize query so RTL-typed form )N(pattern@ is converted to @N(pattern).
 */
function normalizeProximityQuery(query: string): string {
  const t = query.trim()
  const rtl = t.match(PROXIMITY_QUERY_RTL_REGEX)
  if (rtl) {
    const n = rtl[1] || ''
    return `@${n}(${rtl[2].trim()})`
  }
  return t
}

/**
 * Check if a query string is a proximity query (@N(...), @(...), or RTL form).
 */
export function isProximityQuery(query: string): boolean {
  const t = query.trim()
  return (
    (t.startsWith('@') && PROXIMITY_QUERY_REGEX.test(t)) ||
    PROXIMITY_QUERY_RTL_REGEX.test(t)
  )
}

/**
 * Parse @N(pattern1 pattern2 ...) into structured form.
 * N is optional; when omitted, default distance is used.
 * Also accepts RTL form )N(pattern@ and normalizes it first.
 */
export function parseProximityQuery(query: string): ProximityQuery {
  const t = normalizeProximityQuery(query)
  const m = t.match(PROXIMITY_QUERY_REGEX)
  if (!m) {
    throw new Error('Invalid proximity query')
  }
  const distance = m[1]
    ? Math.max(0, parseInt(m[1], 10))
    : DEFAULT_PROXIMITY_DISTANCE
  const inner = m[2].trim()
  const patterns = inner
    ? inner.split(/\s+/).map(p => p.trim()).filter(Boolean)
    : []
  const regexes = patterns.map(patternToRegex)
  return { distance, patterns, regexes }
}

/**
 * Character class for a single Hebrew letter, including final form if any.
 */
function letterClass(char: string): string {
  const pair = FINAL_FORMS[char]
  if (pair) return `[${pair}]`
  return char
}

/**
 * Compile a wildcard pattern to a RegExp.
 * * = any Hebrew letter (zero or more)
 * + = zero or more from prefix/suffix set
 * Letters get final-form equivalence.
 *
 * Leading/trailing wildcards apply only at the edges.
 * If ANY wildcard (* or +) appears BETWEEN the first and last Hebrew
 * letter, the broadest type is inserted between EVERY pair of Hebrew
 * letters (* > +). So +ש+לם+ has middle wildcards, but +שלם+ does not.
 */
export function patternToRegex(pattern: string): RegExp {
  const chars = [...pattern]

  // Locate first and last Hebrew letter
  let firstHeb = -1
  let lastHeb = -1
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] >= '\u05D0' && chars[i] <= '\u05EA') {
      if (firstHeb === -1) firstHeb = i
      lastHeb = i
    }
  }
  if (firstHeb === -1) return /(?!)/u // no Hebrew letters — never matches

  // Detect broadest wildcard BETWEEN Hebrew letters only (* beats +)
  let hasMiddleStar = false
  let hasMiddlePlus = false
  for (let i = firstHeb + 1; i < lastHeb; i++) {
    if (chars[i] === '*') hasMiddleStar = true
    else if (chars[i] === '+') hasMiddlePlus = true
  }
  const middleWild = hasMiddleStar
    ? `[${HEBREW_LETTERS}]*`
    : hasMiddlePlus
      ? `${PLUS_CLASS}*`
      : ''

  // Leading wildcards (before first Hebrew letter)
  let re = ''
  for (let i = 0; i < firstHeb; i++) {
    if (chars[i] === '*') re += `[${HEBREW_LETTERS}]*`
    else if (chars[i] === '+') re += `${PLUS_CLASS}*`
  }

  // Collect Hebrew letters in the core of the pattern
  const hebrewLetters: string[] = []
  for (let i = firstHeb; i <= lastHeb; i++) {
    if (chars[i] >= '\u05D0' && chars[i] <= '\u05EA') {
      hebrewLetters.push(chars[i])
    }
  }

  // Build core: each letter with optional middle wildcard between pairs
  for (let i = 0; i < hebrewLetters.length; i++) {
    re += letterClass(hebrewLetters[i])
    if (i < hebrewLetters.length - 1 && middleWild) {
      re += middleWild
    }
  }

  // Trailing wildcards (after last Hebrew letter)
  for (let i = lastHeb + 1; i < chars.length; i++) {
    if (chars[i] === '*') re += `[${HEBREW_LETTERS}]*`
    else if (chars[i] === '+') re += `${PLUS_CLASS}*`
  }

  return new RegExp(`^${re}$`, 'u')
}

/**
 * Strip nikud/cantillation from a string.
 */
function stripNikud(text: string): string {
  return text.replace(NIKUD_REGEX, '')
}

export interface HebrewToken {
  wordIndex: number
  word: string
  normalized: string
  charStart: number
  charEnd: number
}

const HEBREW_TOKEN_REGEX = /[\u05D0-\u05EA\u0591-\u05C7\u05F0-\u05F4]+/gu

/**
 * Tokenize text into Hebrew words (with nikud stripped for matching).
 * Returns tokens with indices in the original text.
 */
export function tokenizeHebrew(text: string): HebrewToken[] {
  const tokens: HebrewToken[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(HEBREW_TOKEN_REGEX.source, 'gu')
  let wordIndex = 0
  while ((match = re.exec(text)) !== null) {
    const raw = match[0]
    const normalized = stripNikud(raw)
    if (normalized.length > 0) {
      tokens.push({
        wordIndex,
        word: raw,
        normalized,
        charStart: match.index,
        charEnd: match.index + raw.length,
      })
      wordIndex++
    }
  }
  return tokens
}

/**
 * Find all combinations of (one position per pattern) where
 * max(positions) - min(positions) <= N.
 * Same word can match multiple patterns (position repeated).
 */
function findProximityGroups(
  positionsByPattern: number[][],
  maxDist: number
): number[][] {
  const n = positionsByPattern.length
  if (n === 0) return []
  if (n === 1) {
    return positionsByPattern[0].map(p => [p])
  }

  // Sort each pattern's positions
  const sorted = positionsByPattern.map(positions =>
    [...positions].sort((a, b) => a - b)
  )

  const results: number[][] = []

  function backtrack(
    patternIdx: number,
    combo: number[],
    currentMin: number,
    currentMax: number
  ) {
    if (patternIdx === n) {
      results.push([...combo])
      return
    }
    const positions = sorted[patternIdx]
    for (const pos of positions) {
      const newMin = Math.min(currentMin, pos)
      const newMax = Math.max(currentMax, pos)
      if (newMax - newMin > maxDist) {
        if (pos > currentMax) break
        continue
      }
      combo.push(pos)
      backtrack(patternIdx + 1, combo, newMin, newMax)
      combo.pop()
    }
  }

  const firstPositions = sorted[0]
  for (const pos of firstPositions) {
    backtrack(1, [pos], pos, pos)
  }
  return results
}

/**
 * Run proximity search on document text. Returns match positions in original text.
 */
export function proximitySearchText(
  text: string,
  query: ProximityQuery
): ProximityMatch[] {
  const tokens = tokenizeHebrew(text)
  if (tokens.length === 0) return []

  const { distance, regexes } = query

  // For each pattern, get word indices that match (using normalized token text)
  const positionsByPattern: number[][] = regexes.map(() => [])
  for (let pi = 0; pi < regexes.length; pi++) {
    const re = regexes[pi]
    for (const tok of tokens) {
      if (re.test(tok.normalized)) {
        positionsByPattern[pi].push(tok.wordIndex)
      }
    }
  }

  // Single pattern: every matching word is a "proximity" match (distance 0)
  if (regexes.length === 1) {
    const matches: ProximityMatch[] = []
    for (const wordIdx of positionsByPattern[0]) {
      const tok = tokens[wordIdx]
      matches.push({
        words: [
          {
            wordIndex: wordIdx,
            word: tok.word,
            charStart: tok.charStart,
            charEnd: tok.charEnd,
            patternIndex: 0,
          },
        ],
        charStart: tok.charStart,
        charEnd: tok.charEnd,
      })
    }
    return matches
  }

  const groups = findProximityGroups(positionsByPattern, distance)
  const matches: ProximityMatch[] = []

  for (const combo of groups) {
    const wordIndices = combo
    const wordTokens = wordIndices.map(idx => tokens[idx])
    const charStart = Math.min(...wordTokens.map(t => t.charStart))
    const charEnd = Math.max(...wordTokens.map(t => t.charEnd))
    const words: ProximityMatchWord[] = wordIndices.map((wordIdx, i) => {
      const tok = tokens[wordIdx]
      return {
        wordIndex: wordIdx,
        word: tok.word,
        charStart: tok.charStart,
        charEnd: tok.charEnd,
        patternIndex: i,
      }
    })
    matches.push({ words, charStart, charEnd })
  }

  return matches
}

/**
 * Convert ProximityMatch[] to Omnisearch SearchMatch[] (match string + offset).
 * We flatten to one SearchMatch per matched word span so highlighting works.
 */
export function proximityMatchesToSearchMatches(
  matches: ProximityMatch[]
): SearchMatch[] {
  const seen = new Set<string>()
  const result: SearchMatch[] = []
  for (const pm of matches) {
    for (const w of pm.words) {
      const key = `${w.charStart}:${w.charEnd}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push({
        match: w.word,
        offset: w.charStart,
      })
    }
  }
  return result
}

/**
 * Extract root Hebrew letters from patterns (strip * and +) for MiniSearch pre-filtering.
 * E.g. "+ת*ק*ן+" → "תקן"
 */
export function extractRootTerms(patterns: string[]): string[] {
  const roots: string[] = []
  for (const p of patterns) {
    const letters = p.replace(/[*+]/g, '')
    if (letters.length > 0) roots.push(letters)
  }
  return [...new Set(roots)]
}
