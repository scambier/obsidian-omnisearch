import {
  type CachedMetadata,
  Notice,
  Platform,
  getAllTags,
  parseFrontMatterAliases,
} from 'obsidian'
import type { SearchMatch } from '../globals'
import {
  excerptAfter,
  excerptBefore,
  highlightClass,
  isSearchMatch,
  regexLineSplit,
  regexStripQuotes,
  regexYaml,
} from '../globals'
import { settings } from '../settings'
import { type BinaryLike, createHash } from 'crypto'
import { md5 } from 'pure-md5'

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

/**
 * Used to find excerpts in a note body, or select which words to highlight
 */
export function stringsToRegex(strings: string[]): RegExp {
  if (!strings.length) return /^$/g
  const joined = strings.map(s => '\\b' + escapeRegex(s)).join('|')
  const reg = new RegExp(`(${joined})`, 'gi')
  // console.log(reg)
  return reg
}

export function extractHeadingsFromCache(
  cache: CachedMetadata,
  level: number
): string[] {
  return (
    cache.headings?.filter(h => h.level === level).map(h => h.heading) ?? []
  )
}

export function loopIndex(index: number, nbItems: number): number {
  return (index + nbItems) % nbItems
}

export function makeExcerpt(content: string, offset: number): string {
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

function mapAsync<T, U>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => Promise<U>
): Promise<U[]> {
  return Promise.all(array.map(callbackfn))
}

/**
 * https://stackoverflow.com/a/53508547
 * @param array
 * @param callbackfn
 * @returns
 */
export async function filterAsync<T>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => Promise<boolean>
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
  return text.replace(/(\*|_)+(.+?)(\*|_)+/g, (_match, _p1, p2) => p2)
}

export function getAliasesFromMetadata(
  metadata: CachedMetadata | null
): string[] {
  return metadata?.frontmatter
    ? parseFrontMatterAliases(metadata.frontmatter) ?? []
    : []
}

export function getTagsFromMetadata(metadata: CachedMetadata | null): string[] {
  return metadata ? getAllTags(metadata) ?? [] : []
}

/**
 * https://stackoverflow.com/a/37511463
 */
export function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function getCtrlKeyLabel(): 'ctrl' | '⌘' {
  return Platform.isMacOS ? '⌘' : 'ctrl'
}

export function isFileIndexable(path: string): boolean {
  return (
    (settings.PDFIndexing && path.endsWith('.pdf')) ||
    isFilePlaintext(path) ||
    (settings.imagesIndexing && isFileImage(path))
  )
}

export function isFileImage(path: string): boolean {
  return (
    path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')
  )
}

export function isFilePlaintext(path: string): boolean {
  return getPlaintextExtensions().some(t => path.endsWith(`.${t}`))
}

export function getPlaintextExtensions(): string[] {
  return [...settings.indexedFileTypes, 'md']
}

export function getExtension(path: string): string {
  const split = path.split('.')
  return split[split.length - 1] ?? ''
}

export function makeMD5(data: BinaryLike): string {
  if (Platform.isMobileApp) {
    // A node-less implementation, but since we're not hashing the same data
    // (arrayBuffer vs stringified array) the hash will be different
    return md5(data.toString())
  }
  return createHash('md5').update(data).digest('hex')
}
