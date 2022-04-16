<script lang="ts">
import type { ResultNote } from "./globals"
import { openNote } from "./notes"
import { modal, selectedNote } from "./stores"
import { escapeHTML } from "./utils"

export let selected = false
export let note: ResultNote

$: cleanContent = (() => {
  const content = escapeHTML(note.content)
  const tmp = document.createElement("div")
  tmp.innerHTML = content
  return tmp.textContent
})()

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
    {@html note.basename}
  </span>
  <span class="omnisearch-result__counter">
    {note.matches.length}&nbsp;{note.matches.length > 1 ? "matches" : "match"}
  </span>
  <div class="omnisearch-result__body">
    {@html cleanContent}
  </div>
</div>
