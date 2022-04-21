import type { CachedMetadata } from 'obsidian'
import {
  excerptAfter,
  excerptBefore,
  highlightClass,
  isSearchMatch,
  regexLineSplit,
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
  return new Promise((resolve, reject) => {
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
  return new RegExp(strings.map(escapeRegex).join('|'), 'gi')
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
    const to = Math.min(content.length - 1, pos + excerptAfter)
    content =
      (from > 0 ? '…' : '') +
      content.slice(from, to).trim() +
      (to < content.length - 1 ? '…' : '')
  }
  return escapeHTML(content)
}
