<script lang="ts">
import { MarkdownView, TFile } from "obsidian"
import { tick } from "svelte"
import CmpInput from "./CmpInput.svelte"
import CmpNoteResult from "./CmpNoteResult.svelte"
import type { ResultNote } from "./globals"
import type OmnisearchPlugin from "./main"
import type { OmnisearchModal } from "./modal"
import { resultNotes, searchQuery, selectedNote } from "./stores"
import { escapeHTML, escapeRegex, getAllIndexes, highlighter } from "./utils"

export let plugin: OmnisearchPlugin
export let modal: OmnisearchModal

searchQuery.subscribe(async (q) => {
  const results = getSuggestions(q)
  resultNotes.set(results)
  if (results.length) {
    await tick()
    selectedNote.set(results[0])
  }
})

function getSuggestions(query: string): ResultNote[] {
  const results = plugin.minisearch
    .search(query, {
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      combineWith: "AND",
      boost: {
        basename: 2,
        headings1: 1.5,
        headings2: 1.3,
        headings3: 1.1,
      },
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
  // console.log(`Omnisearch - Results for "${query}"`)
  // console.log(results)

  const suggestions = results.map((result) => {
    let note = plugin.indexedNotes[result.id]
    let basename = escapeHTML(note.basename)
    let content = escapeHTML(note.content)

    // Sort the terms from smaller to larger
    // and highlight them in the title and body
    const terms = result.terms.sort((a, b) => a.length - b.length)
    const reg = new RegExp(terms.map(escapeRegex).join("|"), "gi")
    const matches = getAllIndexes(content, reg)

    // If the body contains a searched term, find its position
    // and trim the text around it
    const pos = content.toLowerCase().indexOf(result.terms[0])
    const surroundLen = 180
    if (pos > -1) {
      const from = Math.max(0, pos - surroundLen)
      const to = Math.min(content.length - 1, pos + surroundLen)
      content =
        (from > 0 ? "…" : "") +
        content.slice(from, to).trim() +
        (to < content.length - 1 ? "…" : "")
    }

    // console.log(matches)
    content = content.replace(reg, highlighter)
    basename = basename.replace(reg, highlighter)

    const resultNote: ResultNote = {
      content,
      basename,
      path: note.path,
      matches,
      occurence: 0,
    }

    return resultNote
  })

  return suggestions
}

async function onChooseSuggestion(item: ResultNote): Promise<void> {
  const file = plugin.app.vault.getAbstractFileByPath(item.path) as TFile
  // const fileCache = this.app.metadataCache.getFileCache(file)
  // console.log(fileCache)
  const content = (await plugin.app.vault.cachedRead(file)).toLowerCase()
  const offset = content.indexOf(
    item.matches[item.occurence].match.toLowerCase()
  )
  await plugin.app.workspace.openLinkText(item.path, "")

  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
  if (!view) {
    throw new Error("OmniSearch - No active MarkdownView")
  }
  const pos = view.editor.offsetToPos(offset)
  pos.ch = 0

  view.editor.setCursor(pos)
  view.editor.scrollIntoView({
    from: { line: pos.line - 10, ch: 0 },
    to: { line: pos.line + 10, ch: 0 },
  })
}

function openNote(event: CustomEvent<ResultNote>): void {
  onChooseSuggestion(event.detail)
  modal.close()
}
</script>

<CmpInput on:enter={openNote} />

<div class="prompt-results">
  {#each $resultNotes as result (result.path)}
    <CmpNoteResult selected={result === $selectedNote} note={result} />
  {/each}
</div>
<div class="prompt-instructions">
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↑↓</span><span>to navigate</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↵</span><span>to open</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">ctrl ↵</span><span
      >to open in a new pane</span
    >
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">shift ↵</span><span>to create</span
    >
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">esc</span><span>to dismiss</span>
  </div>
</div>
