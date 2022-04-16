import type { SearchResult } from 'minisearch'

// Matches a wikiling that begins a string
export const regexWikilink = /^!?\[\[(?<name>.+?)(\|(?<alias>.+?))?\]\]/
export const regexLineSplit = /\r?\n|\r|((\.|\?|!)( |\r?\n|\r))/g
export const regexYaml = /^---\s*\n(.*?)\n?^---\s?/ms

export type SearchNote = {
  path: string
  basename: string
  content: string
}

export type IndexedNote = {
  path: string
  basename: string
  content: string
  headings1: string
  headings2: string
  headings3: string
}

export type SearchMatch = {
  match: string
  offset: number
}
export const isSearchMatch = (o: { offset?: number }): o is SearchMatch => {
  return o.offset !== undefined
}

export type ResultNote = {
  // searchResult: SearchResult
  path: string
  basename: string
  content: string
  foundWords: string[]
  matches: SearchMatch[]
  occurence: number
}
