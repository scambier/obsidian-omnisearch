import type { QueryCombination } from 'minisearch'
import { BRACKETS_AND_SPACE, chsRegex, SPACE_OR_PUNCTUATION } from '../globals'
import { logVerbose, splitCamelCase, splitHyphens } from '../tools/utils'
import type OmnisearchPlugin from '../main'

const markdownLinkExtractor = require('markdown-link-extractor')

export class Tokenizer {
  constructor(private plugin: OmnisearchPlugin) {}

  /**
   * Tokenization for indexing will possibly return more tokens than the original text.
   * This is because we combine different methods of tokenization to get the best results.
   * @param text
   * @returns
   */
  public tokenizeForIndexing(text: string): string[] {
    try {
      const words = this.tokenizeWords(text)
      let urls: string[] = []
      if (this.plugin.settings.tokenizeUrls) {
        try {
          urls = markdownLinkExtractor(text)
        } catch (e) {
          logVerbose('Error extracting urls', e)
        }
      }

      let tokens = this.tokenizeTokens(text, { skipChs: true })
      tokens = [...tokens.flatMap(token => [
        token,
        ...splitHyphens(token),
        ...splitCamelCase(token),
      ]), ...words]

      // Add urls
      if (urls.length) {
        tokens = [...tokens, ...urls]
      }

      // Remove duplicates
      tokens = [...new Set(tokens)]

      return tokens
    } catch (e) {
      console.error('Error tokenizing text, skipping document', e)
      return []
    }
  }

  /**
   * Search tokenization will use the same tokenization methods as indexing,
   * but will combine each group with "OR" operators
   * @param text
   * @returns
   */
  public tokenizeForSearch(text: string): QueryCombination {
    // Extract urls and remove them from the query
    const urls: string[] = markdownLinkExtractor(text)
    text = urls.reduce((acc, url) => acc.replace(url, ''), text)

    const tokens = [...this.tokenizeTokens(text), ...urls].filter(Boolean)

    return {
      combineWith: 'OR',
      queries: [
        { combineWith: 'AND', queries: tokens },
        {
          combineWith: 'AND',
          queries: this.tokenizeWords(text).filter(Boolean),
        },
        { combineWith: 'AND', queries: tokens.flatMap(splitHyphens) },
        { combineWith: 'AND', queries: tokens.flatMap(splitCamelCase) },
      ],
    }
  }

  private tokenizeWords(text: string, { skipChs = false } = {}): string[] {
    const tokens = text.split(BRACKETS_AND_SPACE)
    if (skipChs) return tokens
    return this.tokenizeChsWord(tokens)
  }

  private tokenizeTokens(text: string, { skipChs = false } = {}): string[] {
    const tokens = text.split(SPACE_OR_PUNCTUATION)
    if (skipChs) return tokens
    return this.tokenizeChsWord(tokens)
  }

  private tokenizeChsWord(tokens: string[]): string[] {
    const segmenter = this.plugin.getChsSegmenter()
    if (!segmenter) return tokens
    return tokens.flatMap(word =>
      chsRegex.test(word) ? segmenter.cut(word, { search: true }) : [word]
    )
  }
}
