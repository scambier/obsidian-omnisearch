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
}

export type ResultNote = {
  path: string
  basename: string
  content: string
  keyword: string
  occurence: number
}
