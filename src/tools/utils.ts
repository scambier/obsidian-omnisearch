import {
  type CachedMetadata,
  getAllTags,
  parseFrontMatterAliases,
  Platform,
} from 'obsidian'
import { isSearchMatch, type SearchMatch } from '../globals'
import { type BinaryLike, createHash } from 'crypto'
import { md5 } from 'pure-md5'

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
export function removeDiacritics(str: string, arabic = false): string {
  if (str === null || str === undefined) {
    return ''
  }

  // Japanese diacritics that should be distinguished
  const japaneseDiacritics: string[] = ['\\u30FC', '\\u309A', '\\u3099']
  const regexpExclude: string = japaneseDiacritics.join('|')
  const regexp: RegExp = new RegExp(`(?!${regexpExclude})\\p{Diacritic}`, 'gu')

  if (arabic) {
    // Arabic diacritics
    // https://stackoverflow.com/a/40959537
    str = str
      .replace(/([^\u0621-\u063A\u0641-\u064A\u0660-\u0669a-zA-Z 0-9])/g, '')
      .replace(/(آ|إ|أ)/g, 'ا')
      .replace(/(ة)/g, 'ه')
      .replace(/(ئ|ؤ)/g, 'ء')
      .replace(/(ى)/g, 'ي')
    for (let i = 0; i < 10; i++) {
      str.replace(String.fromCharCode(0x660 + i), String.fromCharCode(48 + i))
    }
  }

  // Keep backticks for code blocks, because otherwise they are removed by the .normalize() function
  // https://stackoverflow.com/a/36100275
  str = str.replaceAll('`', '[__omnisearch__backtick__]')
  // Keep caret same as above
  str = str.replaceAll('^', '[__omnisearch__caret__]')
  // To keep right form of Korean character, NFC normalization is necessary
  str = str.normalize('NFD').replace(regexp, '').normalize('NFC')
  str = str.replaceAll('[__omnisearch__backtick__]', '`')
  str = str.replaceAll('[__omnisearch__caret__]', '^')
  return str
}

export function getCtrlKeyLabel(): 'ctrl' | '⌘' {
  return Platform.isMacOS ? '⌘' : 'ctrl'
}

export function isFileImage(path: string): boolean {
  const ext = getExtension(path)
  return ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || ext === 'gif'
}

export function isFilePDF(path: string): boolean {
  return getExtension(path) === 'pdf'
}

export function isFileOffice(path: string): boolean {
  const ext = getExtension(path)
  return ext === 'docx' || ext === 'xlsx'
}

export function isFileCanvas(path: string): boolean {
  return path.endsWith('.canvas')
}

export function isFileExcalidraw(path: string): boolean {
  return path.endsWith('.excalidraw')
}

export function isFileFromDataloom(path: string): boolean {
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
  // if no camel case found, do nothing
  if (!/[a-z][A-Z]/.test(text)) {
    return []
  }
  const splittedText = text
    .replace(/([a-z](?=[A-Z]))/g, '$1 ')
    .split(' ')
    .filter(t => t)
  return splittedText
}

/**
 * Converts a 'foo-bar-baz' into ['foo', 'bar', 'baz']
 * If the string isn't hyphenated, returns an empty array
 * @param text
 */
export function splitHyphens(text: string): string[] {
  if (!text.includes('-')) {
    return []
  }
  return text.split('-').filter(t => t)
}

export function logVerbose(...args: any[]): void {
  printVerbose(console.debug, ...args)
}

export function warnVerbose(...args: any[]): void {
  printVerbose(console.warn, ...args)
}

let verboseLoggingEnabled = false
export function enableVerboseLogging(enable: boolean): void {
  verboseLoggingEnabled = enable
}

function printVerbose(fn: (...args: any[]) => any, ...args: any[]): void {
  if (verboseLoggingEnabled) {
    fn(...args)
  }
}
