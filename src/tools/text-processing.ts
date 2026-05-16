import { excerptAfter, excerptBefore, type SearchMatch } from '../globals'
import { removeDiacritics, warnVerbose } from './utils'
import type { Query } from '../search/query'
import { Notice } from 'obsidian'
import { escapeRegExp } from 'lodash-es'
import type OmnisearchPlugin from '../main'

// When matching with "ignore diacritics", allow these between base letters so we
// search the original text and get correct indices (normalized text has different length).
// Exclude U+05BE (maqaf ־) — it's a hyphen, not a diacritic.
const OPTIONAL_DIACRITICS_CLASS =
  '[\\u0591-\\u05BD\\u05BF-\\u05C7\\u0300-\\u036f]' // Hebrew nikud + Latin combining
const OPTIONAL_DIACRITICS_CLASS_ARABIC =
  '[\\u0591-\\u05BD\\u05BF-\\u05C7\\u0300-\\u036f\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED]'

export class TextProcessor {
  constructor(private plugin: OmnisearchPlugin) {}

  /**
   * Wraps the matches in the text with a <span> element and a highlight class
   * @param text
   * @param matches
   * @returns The html string with the matches highlighted
   */
  public highlightText(text: string, matches: SearchMatch[]): string {
    const highlightClass = `suggestion-highlight omnisearch-highlight ${
      this.plugin.settings.highlight ? 'omnisearch-default-highlight' : ''
    }`

    if (!matches.length) {
      return text
    }
    try {
      return text.replace(
        new RegExp(
          `(${matches.map(item => escapeRegExp(item.match)).join('|')})`,
          'giu'
        ),
        `<span class="${highlightClass}">$1</span>`
      )
    } catch (e) {
      console.error('Omnisearch - Error in highlightText()', e)
      return text
    }
  }

  /**
   * Converts a list of strings to a list of words, using the \b word boundary.
   * Used to find excerpts in a note body, or select which words to highlight.
   */
  public stringsToRegex(strings: string[]): RegExp {
    if (!strings.length) return /^$/g

    // sort strings by decreasing length, so that longer strings are matched first
    strings.sort((a, b) => b.length - a.length)

    const joined = `(${strings
      .map(s => `\\b${escapeRegExp(s)}\\b|${escapeRegExp(s)}`)
      .join('|')})`

    return new RegExp(`${joined}`, 'gui')
  }

  /**
   * Builds a regex pattern that matches a word with optional diacritics between
   * each character. Used on the *original* text so match indices are correct
   * (normalized text has different length and would give wrong highlight spans).
   */
  private regexForWordWithOptionalDiacritics(
    word: string,
    arabic: boolean
  ): string {
    const diacriticsClass = arabic
      ? OPTIONAL_DIACRITICS_CLASS_ARABIC
      : OPTIONAL_DIACRITICS_CLASS
    const opt = `(?:${diacriticsClass})*`
    const chars = [...word].map(c => escapeRegExp(c))
    if (chars.length === 0) return ''
    return chars.join(opt) + opt
  }

  /**
   * Returns an array of matches in the text, using the provided regex
   * @param text
   * @param reg
   * @param query
   */
  public getMatches(
    text: string,
    words: string[],
    query?: Query
  ): SearchMatch[] {
    words = words.map(escapeHTML)
    const originalText = text
    const ignoreDiacritics = this.plugin.settings.ignoreDiacritics
    const arabic = this.plugin.settings.ignoreArabicDiacritics

    let reg: RegExp
    let searchText: string

    if (ignoreDiacritics) {
      // Match on original text with optional diacritics between letters so
      // indices and matched strings are correct (normalized text has different length).
      const sorted = [...words].sort((a, b) => b.length - a.length)
      const patterns = sorted
        .map(w => this.regexForWordWithOptionalDiacritics(w, arabic))
        .filter(Boolean)
      if (!patterns.length) return []
      // Don't use \b word boundaries — they're unreliable with Hebrew in many engines.
      // Match the pattern (word + optional diacritics) anywhere; prefix matches still work.
      const joined = `(?:${patterns.map(p => `(?:${p})`).join('|')})`
      reg = new RegExp(joined, 'giu')
      searchText = originalText
    } else {
      reg = this.stringsToRegex(words)
      searchText = originalText
    }

    const startTime = new Date().getTime()
    let match: RegExpExecArray | null = null
    let matches: SearchMatch[] = []
    let count = 0
    while ((match = reg.exec(searchText)) !== null) {
      if (++count >= 100 || new Date().getTime() - startTime > 50) {
        warnVerbose('Stopped getMatches at', count, 'results')
        break
      }
      const originalMatch = match[0].trim()
      if (originalMatch && match.index >= 0) {
        matches.push({ match: originalMatch, offset: match.index })
      }
    }

    // If the query is more than 1 token and can be found "as is" in the text, put this match first
    if (
      query &&
      (query.query.text.length > 1 || query.getExactTerms().length > 0)
    ) {
      const bestStr = query.getBestStringForExcerpt()
      const bestMatch = matches.find(m => {
        const normalized = ignoreDiacritics
          ? removeDiacritics(m.match, arabic)
          : m.match
        return normalized.toLowerCase() === bestStr.toLowerCase()
      })
      if (bestMatch) {
        matches = [
          bestMatch,
          ...matches.filter(m => m !== bestMatch),
        ]
      }
    }
    return matches
  }

  public makeExcerpt(content: string, offset: number): string {
    const settings = this.plugin.settings
    try {
      const pos = offset ?? -1
      const from = Math.max(0, pos - excerptBefore)
      const to = Math.min(content.length, pos + excerptAfter)
      if (pos > -1) {
        content =
          (from > 0 ? '…' : '') +
          content.slice(from, to).trim() +
          (to < content.length - 1 ? '…' : '')
      } else {
        content = content.slice(0, excerptAfter)
      }
      if (settings.renderLineReturnInExcerpts) {
        const lineReturn = new RegExp(/(?:\r\n|\r|\n)/g)
        // Remove multiple line returns
        content = content
          .split(lineReturn)
          .filter(l => l)
          .join('\n')

        const last = content.lastIndexOf('\n', pos - from)

        if (last > 0) {
          content = content.slice(last)
        }
      }

      content = escapeHTML(content)

      if (settings.renderLineReturnInExcerpts) {
        content = content.trim().replaceAll('\n', '<br>')
      }

      return content
    } catch (e) {
      new Notice(
        'Omnisearch - Error while creating excerpt, see developer console'
      )
      console.error(`Omnisearch - Error while creating excerpt`)
      console.error(e)
      return ''
    }
  }
}

export function escapeHTML(html: string): string {
  return html
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
