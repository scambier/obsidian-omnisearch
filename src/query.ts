import { escapeRegex, stringsToRegex, stripSurroundingQuotes } from './utils'

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
    const tokens = parseQuery(text.toLowerCase(), { tokenize: true })
    this.exclusions = tokens.exclude.text
      .map(this.formatToken)
      .filter(o => !!o.value)
    this.segments = tokens.text.map(this.formatToken)
  }

  public segmentsToStr(): string {
    return this.segments.map(({ value }) => value).join(' ')
  }

  public segmentsToRegex(): RegExp {
    return stringsToRegex(this.segments.map(s => s.value))
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

/*!
 * search-query-parser.js
 * Original: https://github.com/nepsilon/search-query-parser
 * Modified by Simon Cambier
 * Copyright(c) 2014-2019
 * MIT Licensed
 */

interface SearchParserOptions {
  offsets?: boolean
  tokenize: true
  keywords?: string[]
  ranges?: string[]
  alwaysArray?: boolean
}

interface ISearchParserDictionary {
  [key: string]: any
}

type SearchParserKeyWordOffset = {
  keyword: string
  value?: string
}

type SearchParserTextOffset = {
  text: string
}

type SearchParserOffset = (
  | SearchParserKeyWordOffset
  | SearchParserTextOffset
) & {
  offsetStart: number
  offsetEnd: number
}

interface SearchParserResult extends ISearchParserDictionary {
  text: string[]
  offsets: SearchParserOffset[]
  exclude: { text: string[] }
}

function parseQuery(
  string: string,
  options: SearchParserOptions,
): SearchParserResult {
  // Set a default options object when none is provided
  if (!options) {
    options = { offsets: true, tokenize: true }
  }
  else {
    // If options offsets was't passed, set it to true
    options.offsets =
      typeof options.offsets === 'undefined' ? true : options.offsets
  }

  if (!string) {
    string = ''
  }

  // Our object to store the query object
  const query: SearchParserResult = {
    text: [],
    offsets: [],
    exclude: { text: [] },
  }
  // When offsets is true, create their array
  if (options.offsets) {
    query.offsets = []
  }
  const exclusion: ISearchParserDictionary & { text: string[] } = { text: [] }
  const terms = []
  // Get a list of search terms respecting single and double quotes
  const regex =
    /(\S+:'(?:[^'\\]|\\.)*')|(\S+:"(?:[^"\\]|\\.)*")|(-?"(?:[^"\\]|\\.)*")|(-?'(?:[^'\\]|\\.)*')|\S+|\S+:\S+/g
  let match
  while ((match = regex.exec(string)) !== null) {
    let term = match[0]
    const sepIndex = term.indexOf(':')

    // Terms that contain a `:`
    if (sepIndex !== -1) {
      const key = term.slice(0, sepIndex)
      let val = term.slice(sepIndex + 1)

      // Strip backslashes respecting escapes
      val = (val + '').replace(/\\(.?)/g, function (s, n1) {
        switch (n1) {
          case '\\':
            return '\\'
          case '0':
            return '\u0000'
          case '':
            return ''
          default:
            return n1
        }
      })
      terms.push({
        keyword: key,
        value: val,
        offsetStart: match.index,
        offsetEnd: match.index + term.length,
      })
    }

    // Other terms
    else {
      let isExcludedTerm = false
      if (term[0] === '-') {
        isExcludedTerm = true
        term = term.slice(1)
      }

      // Strip backslashes respecting escapes
      term = (term + '').replace(/\\(.?)/g, function (s, n1) {
        switch (n1) {
          case '\\':
            return '\\'
          case '0':
            return '\u0000'
          case '':
            return ''
          default:
            return n1
        }
      })

      if (isExcludedTerm) {
        exclusion.text.push(term)
      }
      else {
        terms.push({
          text: term,
          offsetStart: match.index,
          offsetEnd: match.index + term.length,
        })
      }
    }
  }
  // Reverse to ensure proper order when pop()'ing.
  terms.reverse()
  // For each search term
  let term
  while ((term = terms.pop())) {
    // When just a simple term
    if (term.text) {
      // We add it as pure text
      query.text.push(term.text)
      // When offsets is true, push a new offset
      if (options.offsets) {
        query.offsets.push(term)
      }
    }
    // We got an advanced search syntax
    else if (term.keyword) {
      let key = term.keyword
      // Check if the key is a registered keyword
      options.keywords = options.keywords || []
      let isKeyword = false
      let isExclusion = false
      if (!/^-/.test(key)) {
        isKeyword = !(options.keywords.indexOf(key) === -1)
      }
      else if (key[0] === '-') {
        const _key = key.slice(1)
        isKeyword = !(options.keywords.indexOf(_key) === -1)
        if (isKeyword) {
          key = _key
          isExclusion = true
        }
      }

      // Check if the key is a registered range
      options.ranges = options.ranges || []
      const isRange = !(options.ranges.indexOf(key) === -1)
      // When the key matches a keyword
      if (isKeyword) {
        // When offsets is true, push a new offset
        if (options.offsets) {
          query.offsets.push({
            keyword: key,
            value: term.value,
            offsetStart: isExclusion ? term.offsetStart + 1 : term.offsetStart,
            offsetEnd: term.offsetEnd,
          })
        }

        const value = term.value
        // When value is a thing
        if (value.length) {
          // Get an array of values when several are there
          const values = value.split(',')
          if (isExclusion) {
            if (exclusion[key]) {
              // ...many times...
              if (exclusion[key] instanceof Array) {
                // ...and got several values this time...
                if (values.length > 1) {
                  // ... concatenate both arrays.
                  exclusion[key] = exclusion[key].concat(values)
                }
                else {
                  // ... append the current single value.
                  exclusion[key].push(value)
                }
              }
              // We saw that keyword only once before
              else {
                // Put both the current value and the new
                // value in an array
                exclusion[key] = [exclusion[key]]
                exclusion[key].push(value)
              }
            }
            // First time we see that keyword
            else {
              // ...and got several values this time...
              if (values.length > 1) {
                // ...add all values seen.
                exclusion[key] = values
              }
              // Got only a single value this time
              else {
                // Record its value as a string
                if (options.alwaysArray) {
                  // ...but we always return an array if option alwaysArray is true
                  exclusion[key] = [value]
                }
                else {
                  // Record its value as a string
                  exclusion[key] = value
                }
              }
            }
          }
          else {
            // If we already have seen that keyword...
            if (query[key]) {
              // ...many times...
              if (query[key] instanceof Array) {
                // ...and got several values this time...
                if (values.length > 1) {
                  // ... concatenate both arrays.
                  query[key] = query[key].concat(values)
                }
                else {
                  // ... append the current single value.
                  query[key].push(value)
                }
              }
              // We saw that keyword only once before
              else {
                // Put both the current value and the new
                // value in an array
                query[key] = [query[key]]
                query[key].push(value)
              }
            }
            // First time we see that keyword
            else {
              // ...and got several values this time...
              if (values.length > 1) {
                // ...add all values seen.
                query[key] = values
              }
              // Got only a single value this time
              else {
                if (options.alwaysArray) {
                  // ...but we always return an array if option alwaysArray is true
                  query[key] = [value]
                }
                else {
                  // Record its value as a string
                  query[key] = value
                }
              }
            }
          }
        }
      }
      // The key allows a range
      else if (isRange) {
        // When offsets is true, push a new offset
        if (options.offsets) {
          query.offsets.push(term)
        }

        const value = term.value
        // Range are separated with a dash
        const rangeValues = value.split('-')
        // When both end of the range are specified
        // keyword:XXXX-YYYY
        query[key] = {}
        if (rangeValues.length === 2) {
          query[key].from = rangeValues[0]
          query[key].to = rangeValues[1]
        }
        // When pairs of ranges are specified
        // keyword:XXXX-YYYY,AAAA-BBBB
        // else if (!rangeValues.length % 2) {
        // }
        // When only getting a single value,
        // or an odd number of values
        else {
          query[key].from = value
        }
      }
      else {
        // We add it as pure text
        const text = term.keyword + ':' + term.value
        query.text.push(text)

        // When offsets is true, push a new offset
        if (options.offsets) {
          query.offsets.push({
            text: text,
            offsetStart: term.offsetStart,
            offsetEnd: term.offsetEnd,
          })
        }
      }
    }
  }

  // Return forged query object
  query.exclude = exclusion
  return query
}
