import { type App, type CachedMetadata, MarkdownView, TFile } from 'obsidian'
import type { ResultNote } from '../globals'

/**
 * Extracts the PDF page number from content based on the offset, looking for page markers in format: `^# Page N^page=N$`
 */
function getPdfPageFromOffset(content: string, offset: number): number | null {
  // return early if the inputs do not look valid (e.g. if text extractor does not support Page markers)
  if (!content.includes('# Page ') || offset > content.length) return null

  // We're looking for the last # Page marker, set search space to all text prior to our match
  const textBeforeOffset = content.substring(0, offset)

  // Iterate through all # Page heading matches, collecting the last one
  const regex = /^# Page ([0-9]+)\^page=\1$/gm
  let lastMatch: RegExpExecArray | null = null
  let match: RegExpExecArray | null
  while (
    (match = regex.exec(textBeforeOffset)) !== null
  ) {
    lastMatch = match
  }

  // If we found a match, that's the page the result appears on
  return lastMatch ? parseInt(lastMatch[1], 10) : null
}

export async function openNote(
  app: App,
  item: ResultNote,
  offset = 0,
  newPane = false,
  newLeaf = false
): Promise<void> {
  // We don't have a way to switch pages on a PDF view, so we must open a new pane for PDF results to trigger page navigation
  // We should only trigger this behaviour if we know the page number for the result
  // This code runs before the normal implementation because we don't want to trigger activation of an existing pane for this PDF and then open a new one on top
  const isPdf = item.path.toLowerCase().endsWith('.pdf')
  if (isPdf) {
    const pdfPage = isPdf ? getPdfPageFromOffset(item.content, offset) : null
    if (pdfPage !== null) {
      // Obsidian also supports &selection= but this takes page content id references
      const linkPath = `${item.path}#page=${pdfPage}`

      await app.workspace.openLinkText(
        linkPath,
        '',
        newLeaf ? 'split' : newPane
      )
      return
    }
  }

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
    // For PDFs, extract page number and append to path
    // TODO if we knew the view type for PDF could we reuse an existing view?
    let linkPath = item.path

    if (isPdf && offset > 0) {
      // If this PDF extract has page headings, use them
      const pageNum = getPdfPageFromOffset(item.content, offset)

      if (pageNum !== null) {
        linkPath = `${item.path}#page=${pageNum}`
      }
    }

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
