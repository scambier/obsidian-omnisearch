import { MarkdownView } from 'obsidian'
import { get } from 'svelte/store'
import type { ResultNote } from './globals'
import { plugin } from './stores'
import { stringsToRegex } from './utils'

export async function openNote(
  item: ResultNote,
  newPane = false,
): Promise<void> {
  const app = get(plugin).app
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
