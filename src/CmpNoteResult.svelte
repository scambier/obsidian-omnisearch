<script lang="ts">
import type { ResultNote } from "./globals"
import { openNote } from "./notes"
import { modal, selectedNote } from "./stores"
import { escapeHTML, escapeRegex, getAllIndices, highlighter } from "./utils"

export let selected = false
export let note: ResultNote

function cleanContent(content: string): string {
  const pos = content.toLowerCase().indexOf(note.searchResult.terms[0])
  const surroundLen = 180
  if (pos > -1) {
    const from = Math.max(0, pos - surroundLen)
    const to = Math.min(content.length - 1, pos + surroundLen)
    content =
      (from > 0 ? "…" : "") +
      content.slice(from, to).trim() +
      (to < content.length - 1 ? "…" : "")
  }
  const tmp = document.createElement("div")
  tmp.innerHTML = escapeHTML(content)

  return tmp.textContent ?? ''
}
$: reg = new RegExp(note.searchResult.terms.map(escapeRegex).join('|'), 'gi')

$: cleanedContent = cleanContent(note.content)

function onHover() {
  $selectedNote = note
}
function onClick() {
  openNote(note)
  $modal.close()
}
</script>

<div
  data-note-id={note.path}
  class="suggestion-item omnisearch-result"
  class:is-selected={selected}
  on:mouseover={onHover}
  on:focus={onHover}
  on:click={onClick}
>
  <span class="omnisearch-result__title">
    {@html note.basename.replace(reg, highlighter)}
  </span>
  <span class="omnisearch-result__counter">
    {note.matches.length}&nbsp;{note.matches.length > 1 ? "matches" : "match"}
  </span>
  <div class="omnisearch-result__body">
    {@html cleanedContent.replace(reg, highlighter)}
  </div>
</div>
