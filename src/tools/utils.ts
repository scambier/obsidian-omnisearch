import {
  type CachedMetadata,
  getAllTags,
  Notice,
  parseFrontMatterAliases,
  Platform,
} from 'obsidian'
import {
  excerptAfter,
  excerptBefore,
  getChsSegmenter,
  getTextExtractor,
  highlightClass,
  isSearchMatch,
  regexLineSplit,
  regexStripQuotes,
  regexYaml,
  SPACE_OR_PUNCTUATION,
  type SearchMatch,
} from '../globals'
import { settings } from '../settings'
import { type BinaryLike, createHash } from 'crypto'
import { md5 } from 'pure-md5'

export function highlighter(str: string): string {
  return `<span class="${highlightClass}">${str}</span>`
}

export function highlighterGroups(substring: string, ...args: any[]) {
  // args[0] is the single char preceding args[1], which is the word we want to highlight
  if (!!args[1].trim())
    return `<span>${args[0]}</span><span class="${highlightClass}">${args[1]}</span>`
  return '&lt;no content&gt;'
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

export function pathWithoutFilename(path: string): string {
  const split = path.split('/')
  split.pop()
  return split.join('/')
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

// https://stackoverflow.com/a/3561711
// but we enclose special chars in brackets to avoid them being interpreted as regex
export function escapeRegex(str: string): string {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '[$&]')
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

  // sort strings by decreasing length, so that longer strings are matched first
  strings.sort((a, b) => b.length - a.length)

  const joined =
    '(' +
    // Default word split is not applied if the user uses the cm-chs-patch plugin
    (getChsSegmenter()
      ? ''
      : // Split on start of line, spaces, punctuation, or capital letters (for camelCase)
      // We also add the hyphen to the list of characters that can split words
      settings.splitCamelCase
      ? `^|${SPACE_OR_PUNCTUATION.source}|\-|[A-Z]`
      : `^|${SPACE_OR_PUNCTUATION.source}|\-`) +
    ')' +
    `(${strings.map(s => escapeRegex(s)).join('|')})`

  const reg = new RegExp(`${joined}`, 'giu')
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
  return array.filter((_value, index) => filterMap[index])
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
  let tags = metadata ? getAllTags(metadata) ?? [] : []
  // This will "un-nest" tags that are in the form of "#tag/subtag"
  // A tag like "#tag/subtag" will be split into 3 tags: '#tag/subtag", "#tag" and "#subtag"
  // https://github.com/scambier/obsidian-omnisearch/issues/146
  tags = [
    ...new Set(
      tags.reduce((acc, tag) => {
        return [
          ...acc,
          ...tag
            .split('/')
            .filter(t => t)
            .map(t => (t.startsWith('#') ? t : `#${t}`)),
          tag,
        ]
      }, [] as string[])
    ),
  ]
  return tags
}

/**
 * https://stackoverflow.com/a/37511463
 */
export function removeDiacritics(str: string): string {
  if (str === null || str === undefined) {
    return ''
  }
  // Keep backticks for code blocks, because otherwise they are removed by the .normalize() function
  // https://stackoverflow.com/a/36100275
  str = str.replaceAll('`', '[__omnisearch__backtick__]')
  str = str.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  str = str.replaceAll('[__omnisearch__backtick__]', '`')
  return str
}

export function getCtrlKeyLabel(): 'ctrl' | '⌘' {
  return Platform.isMacOS ? '⌘' : 'ctrl'
}

export function isFileIndexable(path: string): boolean {
  const hasTextExtractor = !!getTextExtractor()
  const canIndexPDF = hasTextExtractor && settings.PDFIndexing
  const canIndexImages = hasTextExtractor && settings.imagesIndexing
  return (
    isFilePlaintext(path) ||
    isFileCanvas(path) ||
    isFileFromDataloomPlugin(path) ||
    (canIndexPDF && isFilePDF(path)) ||
    (canIndexImages && isFileImage(path))
  )
}

export function isFileImage(path: string): boolean {
  const ext = getExtension(path)
  return ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp'
}

export function isFilePDF(path: string): boolean {
  return getExtension(path) === 'pdf'
}

export function isFilePlaintext(path: string): boolean {
  return [...settings.indexedFileTypes, 'md'].some(t => path.endsWith(`.${t}`))
}

export function isFileCanvas(path: string): boolean {
  return path.endsWith('.canvas')
}

export function isFileFromDataloomPlugin(path: string): boolean {
  return path.endsWith('.loom')
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

export function chunkArray<T>(arr: T[], len: number): T[][] {
  const chunks = []
  let i = 0
  const n = arr.length

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)))
  }

  return chunks
}

/**
 * Converts a 'fooBarBAZLorem' into ['foo', 'Bar', 'BAZ', 'Lorem']
 * If the string isn't camelCase, returns an empty array
 * @param text
 */
export function splitCamelCase(text: string): string[] {
  const split = text
    .replace(/([a-z](?=[A-Z]))/g, '$1 ')
    .split(' ')
    .filter(t => t)
  if (split.length > 1) {
    return split
  }
  return []
}

/**
 * Converts a 'foo-bar-baz' into ['foo', 'bar', 'baz']
 * If the string isn't hyphenated, returns an empty array
 * @param text
 */
export function splitHyphens(text: string): string[] {
  const split = text.split('-').filter(t => t)
  if (split.length > 1) {
    return split
  }
  return []
}

export function logDebug(...args: any[]): void {
  printDebug(console.log, ...args)
}

export function warnDebug(...args: any[]): void {
  printDebug(console.warn, ...args)
}

function printDebug(fn: (...args: any[]) => any, ...args: any[]): void {
  if (settings.verboseLogging) {
    const t = new Date()
    const ts = `${t.getMinutes()}:${t.getSeconds()}:${t.getMilliseconds()}`
    fn(...['Omnisearch -', ts + ' -', ...args])
  }
}
