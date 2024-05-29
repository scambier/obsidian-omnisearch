import { type App, type CachedMetadata, MarkdownView, TFile } from 'obsidian'
import type { ResultNote } from '../globals'

export async function openNote(
  app: App,
  item: ResultNote,
  offset = 0,
  newPane = false,
  newLeaf = false
): Promise<void> {
  // Check if the note is already open,
  // to avoid opening it twice if the first one is pinned
  let alreadyOpenAndPinned = false
  app.workspace.iterateAllLeaves(leaf => {
    if (leaf.view instanceof MarkdownView) {
      if (
        !newPane &&
        leaf.getViewState().state?.file === item.path &&
        leaf.getViewState()?.pinned
      ) {
        app.workspace.setActiveLeaf(leaf, { focus: true })
        alreadyOpenAndPinned = true
      }
    }
  })

  if (!alreadyOpenAndPinned) {
    // Open the note normally
    await app.workspace.openLinkText(item.path, '', newLeaf ? 'split' : newPane)
  }

  const view = app.workspace.getActiveViewOfType(MarkdownView)
  if (!view) {
    // Not an editable document, so no cursor to place
    // throw new Error('OmniSearch - No active MarkdownView')
    return
  }
  const pos = view.editor.offsetToPos(offset)
  // pos.ch = 0

  view.editor.setCursor(pos)
  view.editor.scrollIntoView({
    from: { line: pos.line - 10, ch: 0 },
    to: { line: pos.line + 10, ch: 0 },
  })
}

export async function createNote(
  app: App,
  name: string,
  newLeaf = false
): Promise<void> {
  try {
    let pathPrefix: string
    switch (app.vault.getConfig('newFileLocation')) {
      case 'current':
        pathPrefix = (app.workspace.getActiveFile()?.parent?.path ?? '') + '/'
        break
      case 'folder':
        pathPrefix = app.vault.getConfig('newFileFolderPath') + '/'
        break
      default: // 'root'
        pathPrefix = ''
        break
    }
    await app.workspace.openLinkText(`${pathPrefix}${name}.md`, '', newLeaf)
  } catch (e) {
    ;(e as any).message =
      'OmniSearch - Could not create note: ' + (e as any).message
    console.error(e)
    throw e
  }
}

/**
 * For a given file, returns a list of links leading to notes that don't exist
 * @param file
 * @param metadata
 * @returns
 */
export function getNonExistingNotes(
  app: App,
  file: TFile,
  metadata: CachedMetadata
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
