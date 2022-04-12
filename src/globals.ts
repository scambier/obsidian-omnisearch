// Matches a wikiling that begins a string
export const regexWikilink = /^!?\[\[(?<name>.+?)(\|(?<alias>.+?))?\]\]/
export const regexLineSplit = /\r?\n|\r|((\.|\?|!)( |\r?\n|\r))/g
export const regexYaml = /^---\s*\n(.*?)\n?^---\s?/ms
