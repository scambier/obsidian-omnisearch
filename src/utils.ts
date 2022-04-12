import markdownToTxt from 'markdown-to-txt'
import { regexLineSplit, regexWikilink, regexYaml } from './globals'

export function highlighter(str: string): string {
  return '<span class="search-result-file-matched-text">' + str + '</span>'
}

/**
 * Strips the markdown and frontmatter
 * @param text
 */
export function clearContent(text: string): string {
  return markdownToTxt(removeFrontMatter(text))
}

/**
 * The "title" line is the first line that isn't a wikilink
 * @param text
 * @returns
 */
export function getTitleLineIndex(lines: string[]): number {
  const index = lines.findIndex(l => !regexWikilink.test(l))
  return index > -1 ? index : 0
}

/**
 * Returns the "title" line from a text
 * @param text
 * @returns
 */
export function getTitleLine(text: string): string {
  const lines = splitLines(text.trim())
  return lines[getTitleLineIndex(lines)]
}

/**
 * Removes the "title" line from a text
 * @param text
 * @returns
 */
export function removeTitleLine(text: string): string {
  const lines = splitLines(text.trim())
  const index = getTitleLineIndex(lines)
  lines.splice(index, 1)
  return lines.join('. ')
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
