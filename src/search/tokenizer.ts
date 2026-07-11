import type { QueryCombination } from 'minisearch'
import { BRACKETS_AND_SPACE, chsRegex, SPACE_OR_PUNCTUATION } from '../globals'
import { logVerbose, splitCamelCase, splitHyphens } from '../tools/utils'
import type OmnisearchPlugin from '../main'
import {
  HAN_GRAM_FIELDS,
  createHanQueryPlan,
  createIndexSignature,
  isHanGramField,
  tokenizeHanGramTerms,
} from './han-grams'

const markdownLinkExtractor = require('markdown-link-extractor')

type ChsSegmenter = {
  manifest?: { version?: unknown }
  cut: (word: string, options: { search: true }) => unknown
}

export class Tokenizer {
  private chsPatchDegraded = false

  constructor(private plugin: OmnisearchPlugin) {}

  /**
   * Tokenization for indexing will possibly return more tokens than the original text.
   * This is because we combine different methods of tokenization to get the best results.
   * @param text
   * @returns
   */
  public tokenizeForIndexing(text: string, fieldName?: string): string[] {
    if (fieldName && isHanGramField(fieldName)) {
      return tokenizeHanGramTerms(text)
    }

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
      tokens = [
        ...tokens.flatMap(token => [
          token,
          ...splitHyphens(token),
          ...splitCamelCase(token),
        ]),
        ...words,
      ]

      // Add urls
      if (urls.length) {
        tokens = [...tokens, ...urls]
      }

      // Remove duplicates
      // tokens = [...new Set(tokens)]

      // Remove empty tokens
      tokens = tokens.filter(Boolean)

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
    const { textWithoutUrls, urls } = this.extractUrls(text)
    return this.buildNaturalQuery(textWithoutUrls, urls)
  }

  public tokenizeForHanSearch(
    text: string,
    getRawText: () => string = () => text
  ): { query: QueryCombination; runs: string[] } | null {
    if (!createHanQueryPlan(text)) return null

    const { textWithoutUrls, urls } = this.extractUrls(text)
    const normalizedPlan = createHanQueryPlan(textWithoutUrls)
    if (!normalizedPlan) return null

    const rawTextWithoutUrls = this.extractUrls(getRawText()).textWithoutUrls
    const plan = createHanQueryPlan(rawTextWithoutUrls)
    if (!plan || plan.runs.length !== normalizedPlan.runs.length) {
      return null
    }

    const queries: QueryCombination['queries'] = []
    const naturalQuery = this.buildNaturalQuery(
      normalizedPlan.remainingText,
      urls
    )
    if (this.hasQueryTerms(naturalQuery)) queries.push(naturalQuery)
    queries.push({
      combineWith: 'AND',
      queries: plan.grams,
      fields: HAN_GRAM_FIELDS,
      prefix: false,
      fuzzy: false,
      processTerm: term => term.toLowerCase(),
    })

    return {
      query: { combineWith: 'AND', queries },
      runs: plan.runs,
    }
  }

  public getIndexSignature(): string {
    const segmenter = this.getChsSegmenter()
    const chsPatch = segmenter ? this.getChsPatchSignature(segmenter) : 'absent'
    return createIndexSignature({
      tokenizeUrls: this.plugin.settings.tokenizeUrls,
      ignoreDiacritics: this.plugin.settings.ignoreDiacritics,
      ignoreArabicDiacritics: this.plugin.settings.ignoreArabicDiacritics,
      chsPatch,
    })
  }

  private extractUrls(text: string): {
    textWithoutUrls: string
    urls: string[]
  } {
    const urls: string[] = markdownLinkExtractor(text)
    return {
      textWithoutUrls: urls.reduce((acc, url) => acc.replace(url, ''), text),
      urls,
    }
  }

  private buildNaturalQuery(text: string, urls: string[]): QueryCombination {
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

  private hasQueryTerms(query: QueryCombination): boolean {
    return query.queries.some(subquery => {
      if (typeof subquery === 'string') return Boolean(subquery)
      if (typeof subquery === 'symbol') return true
      return this.hasQueryTerms(subquery)
    })
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
    const segmenter = this.getChsSegmenter()
    if (!segmenter) return tokens
    return tokens.flatMap(word => {
      if (!chsRegex.test(word)) return [word]
      try {
        const segmented = segmenter.cut(word, { search: true })
        const validTokens = this.getValidChsTokens(segmented)
        if (validTokens) return validTokens
        this.chsPatchDegraded = true
        return [word]
      } catch (error) {
        this.chsPatchDegraded = true
        logVerbose('Error tokenizing Chinese word, using fallback', error)
        return [word]
      }
    })
  }

  private getValidChsTokens(segmented: unknown): string[] | null {
    if (!Array.isArray(segmented)) return null
    const validTokens = segmented.filter(
      (token): token is string => typeof token === 'string' && !!token
    )
    return validTokens.length ? validTokens : null
  }

  private getChsPatchSignature(segmenter: ChsSegmenter): string {
    const version = segmenter.manifest?.version
    const versionLabel =
      typeof version === 'string' && version ? version : 'unknown-version'
    if (!this.chsPatchDegraded) {
      try {
        this.chsPatchDegraded = !this.getValidChsTokens(
          segmenter.cut('中文', { search: true })
        )
      } catch {
        this.chsPatchDegraded = true
      }
    }
    return `${versionLabel}:${this.chsPatchDegraded ? 'degraded' : 'ready'}`
  }

  private getChsSegmenter(): ChsSegmenter | undefined {
    const segmenter = this.plugin.getChsSegmenter() as unknown
    if (!segmenter || typeof segmenter !== 'object') return undefined
    const candidate = segmenter as Partial<ChsSegmenter>
    return typeof candidate.cut === 'function'
      ? (candidate as ChsSegmenter)
      : undefined
  }
}
