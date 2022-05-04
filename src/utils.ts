import type { CachedMetadata } from 'obsidian'
import {
  excerptAfter,
  excerptBefore,
  highlightClass,
  isSearchMatch,
  regexLineSplit,
  regexStripQuotes,
  regexYaml,
} from './globals'
import type { SearchMatch } from './globals'

export function highlighter(str: string): string {
  return `<span class="${highlightClass}">${str}</span>`
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
  // Regex to recognize YAML Front Matter (at beginning of file, 3 hyphens, than any charecter, including newlines, then 3 hyphens).
  return text.replace(regexYaml, '')
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

// https://stackoverflow.com/a/3561711
export function escapeRegex(str: string): string {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

/**
 * Returns the positions of all occurences of `val` inside of `text`
 * https://stackoverflow.com/a/58828841
 * @param text
 * @param regex
 * @returns
 */
export function getAllIndices(text: string, regex: RegExp): SearchMatch[] {
  return [...text.matchAll(regex)]
    .map(o => ({ match: o[0], offset: o.index }))
    .filter(isSearchMatch)
}

export function stringsToRegex(strings: string[]): RegExp {
  if (!strings.length) return /^$/
  return new RegExp(strings.map(s => `(${escapeRegex(s)})`).join('|'), 'gi')
}

export function replaceAll(
  text: string,
  terms: string[],
  cb: (t: string) => string,
): string {
  terms.sort((a, b) => a.length - b.length)
  const regs = terms.map(term => new RegExp(escapeRegex(term), 'gi'))
  for (const reg of regs) {
    text = text.replaceAll(reg, cb)
  }
  return text
}

export function extractHeadingsFromCache(
  cache: CachedMetadata,
  level: number,
): string[] {
  return (
    cache.headings?.filter(h => h.level === level).map(h => h.heading) ?? []
  )
}

export function loopIndex(index: number, nbItems: number): number {
  return (index + nbItems) % nbItems
}

export function makeExcerpt(content: string, offset: number): string {
  const pos = offset ?? -1
  if (pos > -1) {
    const from = Math.max(0, pos - excerptBefore)
    const to = Math.min(content.length, pos + excerptAfter)
    content =
      (from > 0 ? '…' : '') +
      content.slice(from, to).trim() +
      (to < content.length - 1 ? '…' : '')
  }
  return escapeHTML(content)
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

function mapAsync<T, U>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => Promise<U>,
): Promise<U[]> {
  return Promise.all(array.map(callbackfn))
}

/**
 * https://stackoverflow.com/a/53508547
 * @param arr
 * @param callback
 * @returns
 */
export async function filterAsync<T>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => Promise<boolean>,
): Promise<T[]> {
  const filterMap = await mapAsync(array, callbackfn)
  return array.filter((value, index) => filterMap[index])
}

/**
 * A simple function to strip bold and italic markdown chars from a string
 * @param text
 * @returns
 */
export function stripMarkdownCharacters(text: string): string {
  return text.replace(/(\*|_)+(.+?)(\*|_)+/g, (match, p1, p2) => p2)
}
