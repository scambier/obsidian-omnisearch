import { MarkdownView } from 'obsidian'
import type { ResultNote } from './globals'
import { stringsToRegex } from './utils'

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
