import {
  type SearchMatch,
  regexLineSplit,
  regexYaml,
  regexStripQuotes,
  excerptAfter,
  excerptBefore,
} from 'src/globals'
import { removeDiacritics, warnDebug } from './utils'
import type { Query } from 'src/search/query'
import { Notice } from 'obsidian'
import { escapeRegExp } from 'lodash-es'
import { getSettings } from 'src/settings'

/**
 * Wraps the matches in the text with a <span> element and a highlight class
 * @param text
 * @param matches
 * @returns The html string with the matches highlighted
 */
export function highlightText(text: string, matches: SearchMatch[]): string {
  const highlightClass = `suggestion-highlight omnisearch-highlight ${
    getSettings().highlight ? 'omnisearch-default-highlight' : ''
  }`
  
  if (!matches.length) {
    return text
  }
  try {
    // Text to highlight
    const smartMatches = new RegExp(
      matches
        .map(
          // This regex will match the word (with \b word boundary)
          // \b doesn't detect non-alphabetical character's word boundary, so we need to escape it
          matchItem => {
            const escaped = escapeRegExp(matchItem.match)
            return `\\b${escaped}\\b${
              !/[a-zA-Z]/.test(matchItem.match) ? `|${escaped}` : ''
            }`
          }
        )
        .join('|'),
      'giu'
    )

    // Replacer function that will highlight the matches
    const replacer = (match: string) => {
      const matchInfo = matches.find(info =>
        match.match(
          new RegExp(
            `\\b${escapeRegExp(info.match)}\\b${
              !/[a-zA-Z]/.test(info.match) ? `|${escapeRegExp(info.match)}` : ''
            }`,
            'giu'
          )
        )
      )
      if (matchInfo) {
        return `<span class="${highlightClass}">${match}</span>`
      }
      return match
    }

    // Effectively highlight the text
    let newText = text.replace(smartMatches, replacer)

    // If the text didn't change (= nothing to highlight), re-run the regex but just replace the matches without the word boundary
    if (newText === text) {
      const dumbMatches = new RegExp(
        matches.map(matchItem => escapeRegExp(matchItem.match)).join('|'),
        'giu'
      )
      newText = text.replace(dumbMatches, replacer)
    }
    return newText
  } catch (e) {
    console.error('Omnisearch - Error in highlightText()', e)
    return text
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

export function splitLines(text: string): string[] {
  return text.split(regexLineSplit).filter(l => !!l && l.length > 2)
}

export function removeFrontMatter(text: string): string {
  // Regex to recognize YAML Front Matter (at beginning of file, 3 hyphens, than any character, including newlines, then 3 hyphens).
  return text.replace(regexYaml, '')
}

/**
 * Converts a list of strings to a list of words, using the \b word boundary.
 * Used to find excerpts in a note body, or select which words to highlight.
 */
export function stringsToRegex(strings: string[]): RegExp {
  if (!strings.length) return /^$/g

  // sort strings by decreasing length, so that longer strings are matched first
  strings.sort((a, b) => b.length - a.length)

  const joined = `(${strings
    .map(s => `\\b${escapeRegExp(s)}\\b|${escapeRegExp(s)}`)
    .join('|')})`

  return new RegExp(`${joined}`, 'gui')
}

/**
 * Returns an array of matches in the text, using the provided regex
 * @param text
 * @param reg
 * @param query
 */
export function getMatches(
  text: string,
  reg: RegExp,
  query?: Query
): SearchMatch[] {
  const originalText = text
  // text = text.toLowerCase().replace(new RegExp(SEPARATORS, 'gu'), ' ')
  if (getSettings().ignoreDiacritics) {
    text = removeDiacritics(text)
  }
  const startTime = new Date().getTime()
  let match: RegExpExecArray | null = null
  let matches: SearchMatch[] = []
  let count = 0
  while ((match = reg.exec(text)) !== null) {
    // Avoid infinite loops, stop looking after 100 matches or if we're taking too much time
    if (++count >= 100 || new Date().getTime() - startTime > 50) {
      warnDebug('Stopped getMatches at', count, 'results')
      break
    }
    const matchStartIndex = match.index
    const matchEndIndex = matchStartIndex + match[0].length
    const originalMatch = originalText
      .substring(matchStartIndex, matchEndIndex)
      .trim()
    if (originalMatch && match.index >= 0) {
      matches.push({ match: originalMatch, offset: match.index })
    }
  }

  // If the query is more than 1 token and can be found "as is" in the text, put this match first
  if (
    query &&
    (query.query.text.length > 1 || query.getExactTerms().length > 0)
  ) {
    const best = text.indexOf(query.getBestStringForExcerpt())
    if (best > -1 && matches.find(m => m.offset === best)) {
      matches.unshift({
        offset: best,
        match: query.getBestStringForExcerpt(),
      })
    }
  }
  return matches
}

export function makeExcerpt(content: string, offset: number): string {
  const settings = getSettings()
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

/**
 * splits a string in words or "expressions in quotes"
 * @param str
 * @returns
 */
export function splitQuotes(str: string): string[] {
  return (
    str
      .match(/"(.*?)"/g)
      ?.map(s => s.replace(/"/g, ''))
      .filter(q => !!q) ?? []
  )
}

export function stripSurroundingQuotes(str: string): string {
  return str.replace(regexStripQuotes, '')
}
