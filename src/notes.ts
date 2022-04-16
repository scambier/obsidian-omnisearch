import { MarkdownView, TFile } from 'obsidian'
import { get } from 'svelte/store'
import type { ResultNote } from './globals'
import { plugin } from './stores'

export async function openNote(
  item: ResultNote,
  newPane = false,
): Promise<void> {
  const app = get(plugin).app
  // const file = app.vault.getAbstractFileByPath(item.path) as TFile
  // const fileCache = app.metadataCache.getFileCache(file)
  // console.log(fileCache)
  const content = item.content// (await app.vault.cachedRead(file)).toLowerCase()
  const offset = content.indexOf(
    item.matches[item.occurence].match.toLowerCase(),
  )
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
