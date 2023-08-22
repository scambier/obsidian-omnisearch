import { settings } from '../settings'
import { removeDiacritics } from '../tools/utils'
import { parse } from 'search-query-parser'

const keywords = ['ext', 'path'] as const

type Keywords = {
  [K in typeof keywords[number]]?: string[]
} & { text: string[] }

export class Query {
  query: Keywords & {
    exclude: Keywords
  }
  #inQuotes: string[]

  constructor(text = '') {
    if (settings.ignoreDiacritics) {
      text = removeDiacritics(text)
    }
    const parsed = parse(text.toLowerCase(), {
      tokenize: true,
      keywords: keywords as unknown as string[],
    }) as unknown as typeof this.query

    // Default values
    parsed.text = parsed.text ?? []
    parsed.exclude = parsed.exclude ?? {}
    parsed.exclude.text = parsed.exclude.text ?? []
    if (!Array.isArray(parsed.exclude.text)) {
      parsed.exclude.text = [parsed.exclude.text]
    }
    // Remove empty excluded strings
    parsed.exclude.text = parsed.exclude.text.filter(o => o.length)

    // Make sure that all fields are string[]
    for (const k of keywords) {
      const v = parsed[k]
      if (v) {
        parsed[k] = Array.isArray(v) ? v : [v]
      }
      const e = parsed.exclude[k]
      if (e) {
        parsed.exclude[k] = Array.isArray(e) ? e : [e]
      }
    }
    this.query = parsed

    // Get strings in quotes, and remove the quotes
    this.#inQuotes =
      text.match(/"([^"]+)"/g)?.map(o => o.replace(/"/g, '')) ?? []
  }

  public isEmpty(): boolean {
    for (const k of keywords) {
      if (this.query[k]?.length) {
        return false
      }
      if (this.query.text.length) {
        return false
      }
    }
    return true
  }

  public segmentsToStr(): string {
    return this.query.text.join(' ')
  }

  public getTags(): string[] {
    return this.query.text.filter(o => o.startsWith('#'))
  }

  public getTagsWithoutHashtag(): string[] {
    return this.getTags().map(o => o.replace(/^#/, ''))
  }

  public getExactTerms(): string[] {
    return [
      ...new Set([
        ...this.query.text.filter(o => o.split(' ').length > 1),
        ...this.#inQuotes,
      ]),
    ]
  }
}
