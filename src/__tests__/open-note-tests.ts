import { describe, expect, it, vi } from 'vitest'
import { MarkdownView } from 'obsidian'
import { openNote } from '../tools/notes'
import type { ResultNote } from '../globals'
import type OmnisearchPlugin from '../main'

vi.mock('../main', () => ({ default: class {} }))

function setup() {
  const editor = {
    offsetToPos: vi.fn((offset: number) => ({ line: 0, ch: offset })),
    setCursor: vi.fn(),
    scrollIntoView: vi.fn(),
    setSelection: vi.fn(),
  }
  // `openNote` only needs the editor, so skip the real constructor
  const view = Object.assign(
    Object.create(MarkdownView.prototype) as MarkdownView,
    { editor }
  )
  const workspace = {
    iterateAllLeaves: vi.fn(),
    openLinkText: vi.fn(async () => {}),
    getActiveViewOfType: vi.fn(() => view),
  }
  const plugin = {
    app: { workspace },
    settings: { indexFilesWithoutExtension: false },
  } as unknown as OmnisearchPlugin
  const note = {
    path: 'note.md',
    content: 'hello world',
    matches: [{ match: 'world', offset: 6 }],
  } as unknown as ResultNote
  return { plugin, note, editor, workspace }
}

describe('openNote', () => {
  it('opens the note and moves the cursor to the match', async () => {
    const { plugin, note, editor, workspace } = setup()
    await openNote(plugin, note, 6)
    expect(workspace.openLinkText).toHaveBeenCalledWith('note.md', '', false)
    expect(editor.setCursor).toHaveBeenCalledWith({ line: 0, ch: 6 })
    expect(editor.setSelection).toHaveBeenCalled()
  })

  it('opens the note without moving the cursor when offset is null', async () => {
    const { plugin, note, editor, workspace } = setup()
    await openNote(plugin, note, null)
    expect(workspace.openLinkText).toHaveBeenCalledWith('note.md', '', false)
    expect(editor.setCursor).not.toHaveBeenCalled()
    expect(editor.scrollIntoView).not.toHaveBeenCalled()
    expect(editor.setSelection).not.toHaveBeenCalled()
  })
})
