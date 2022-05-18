import { MarkdownView, TFile, type CachedMetadata } from 'obsidian'
import type { IndexedNote, ResultNote } from './globals'
import { stringsToRegex } from './utils'

/**
 * This is an in-memory cache of the notes, with all their computed fields
 * used by the search engine.
 * This cache allows us to quickly de-index notes when they are deleted or updated.
 */
export let notesCache: Record<string, IndexedNote> = {}

export function resetNotesCache(): void {
  notesCache = {}
}
export function getNoteFromCache(key: string): IndexedNote | undefined {
  return notesCache[key]
}
export function getNonExistingNotesFromCache(): IndexedNote[] {
  return Object.values(notesCache).filter(note => note.doesNotExist)
}
export function addNoteToCache(key: string, note: IndexedNote): void {
  notesCache[key] = note
}
export function removeNoteFromCache(key: string): void {
  delete notesCache[key]
}

export async function openNote(
  item: ResultNote,
  newPane = false,
): Promise<void> {
  const reg = stringsToRegex(item.foundWords)
  reg.exec(item.content)
  const offset = reg.lastIndex
  await app.workspace.openLinkText(item.path, '', newPane)

  const view = app.workspace.getActiveViewOfType(MarkdownView)
  if (!view) {
    throw new Error('OmniSearch - No active MarkdownView')
  }
  const pos = view.editor.offsetToPos(offset)
  pos.ch = 0

  view.editor.setCursor(pos)
  view.editor.scrollIntoView({
    from: { line: pos.line - 10, ch: 0 },
    to: { line: pos.line + 10, ch: 0 },
  })
}

export async function createNote(name: string): Promise<void> {
  try {
    const file = await app.vault.create(name + '.md', '# ' + name + '\n')
    await app.workspace.openLinkText(file.path, '')
    const view = app.workspace.getActiveViewOfType(MarkdownView)
    if (!view) {
      throw new Error('OmniSearch - No active MarkdownView')
    }
    const pos = view.editor.offsetToPos(name.length + 5)
    pos.ch = 0
  }
  catch (e) {
    console.error(e)
  }
}

/**
 * For a given file, returns a list of links leading to notes that don't exist
 * @param file
 * @param metadata
 * @returns
 */
export function getNonExistingNotes(
  file: TFile,
  metadata: CachedMetadata,
): string[] {
  return (metadata.links ?? [])
    .map(l => {
      const path = removeAnchors(l.link)
      return app.metadataCache.getFirstLinkpathDest(path, file.path)
        ? ''
        : l.link
    })
    .filter(l => !!l)
}

/**
 * Removes anchors and headings
 * @param name
 * @returns
 */
export function removeAnchors(name: string): string {
  return name.split(/[\^#]+/)[0]
}
