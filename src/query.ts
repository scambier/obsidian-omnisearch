import { get } from 'svelte/store'
import { settings } from './settings'
import { removeDiacritics, stripSurroundingQuotes } from './utils'
import { parseQuery } from './vendor/parse-query'

type QueryToken = {
  /**
   * The query token string value
   */
  value: string

  /**
   * Was this token encased in quotes?
   */
  exact: boolean
}

/**
 * This class is used to parse a query string into a structured object
 */
export class Query {
  public segments: QueryToken[] = []
  public exclusions: QueryToken[] = []

  constructor(text = '') {
    if (get(settings).ignoreDiacritics) text = removeDiacritics(text)
    const tokens = parseQuery(text.toLowerCase(), { tokenize: true })
    this.exclusions = tokens.exclude.text
      .map(this.formatToken)
      .filter(o => !!o.value)
    this.segments = tokens.text.map(this.formatToken)
  }

  public segmentsToStr(): string {
    return this.segments.map(({ value }) => value).join(' ')
  }

  /**
   * Returns the terms that are encased in quotes
   * @returns
   */
  public getExactTerms(): string[] {
    return this.segments.filter(({ exact }) => exact).map(({ value }) => value)
  }

  private formatToken(str: string): QueryToken {
    const stripped = stripSurroundingQuotes(str)
    return {
      value: stripped,
      exact: stripped !== str,
    }
  }
}
