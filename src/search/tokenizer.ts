import type { QueryCombination } from 'minisearch'
import {
  BRACKETS_AND_SPACE,
  SPACE_OR_PUNCTUATION,
  chsRegex,
  getChsSegmenter,
} from 'src/globals'
import { settings } from 'src/settings'
import { logDebug, splitCamelCase, splitHyphens } from 'src/tools/utils'
const markdownLinkExtractor = require('markdown-link-extractor')

function tokenizeWords(text: string, { skipChs = false } = {}): string[] {
  const tokens = text.split(BRACKETS_AND_SPACE)
  if (skipChs) return tokens
  return tokenizeChsWord(tokens)
}

function tokenizeTokens(text: string, { skipChs = false } = {}): string[] {
  const tokens = text.split(SPACE_OR_PUNCTUATION)
  if (skipChs) return tokens
  return tokenizeChsWord(tokens)
}

function tokenizeChsWord(tokens: string[]): string[] {
  const segmenter = getChsSegmenter()
  if (!segmenter) return tokens
  return tokens.flatMap(word =>
    chsRegex.test(word) ? segmenter.cut(word, { search: true }) : [word]
  )
}

/**
 * Tokenization for indexing will possibly return more tokens than the original text.
 * This is because we combine different methods of tokenization to get the best results.
 * @param text
 * @returns
 */
export function tokenizeForIndexing(text: string): string[] {
  const words = tokenizeWords(text)
  let urls: string[] = []
  if (settings.tokenizeUrls) {
    try {
      urls = markdownLinkExtractor(text)
    } catch (e) {
      logDebug('Error extracting urls', e)
    }
  }

  let tokens = tokenizeTokens(text, { skipChs: true })

  // Split hyphenated tokens
  tokens = [...tokens, ...tokens.flatMap(splitHyphens)]

  // Split camelCase tokens into "camel" and "case
  tokens = [...tokens, ...tokens.flatMap(splitCamelCase)]

  // Add whole words (aka "not tokens")
  tokens = [...tokens, ...words]

  // Add urls
  if (urls.length) {
    tokens = [...tokens, ...urls]
  }

  // Remove duplicates
  tokens = [...new Set(tokens)]

  return tokens
}

/**
 * Search tokenization will use the same tokenization methods as indexing,
 * but will combine each group with "OR" operators
 * @param text
 * @returns
 */
export function tokenizeForSearch(text: string): QueryCombination {
  // Extract urls and remove them from the query
  const urls: string[] = markdownLinkExtractor(text)
  text = urls.reduce((acc, url) => acc.replace(url, ''), text)

  const tokens = [...tokenizeTokens(text), ...urls].filter(Boolean)

  return {
    combineWith: 'OR',
    queries: [
      { combineWith: 'AND', queries: tokens },
      { combineWith: 'AND', queries: tokenizeWords(text).filter(Boolean) },
      { combineWith: 'AND', queries: tokens.flatMap(splitHyphens) },
      { combineWith: 'AND', queries: tokens.flatMap(splitCamelCase) },
    ],
  }
}
