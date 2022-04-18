<script lang="ts">
import { surroundLen, type ResultNote } from "./globals"
import { openNote } from "./notes"
import { getMatches } from "./search";
import { modal, selectedNote } from "./stores"
import { escapeHTML, highlighter, stringsToRegex } from "./utils"

export let selected = false
export let note: ResultNote

// function getMatches(text: string) {
//   let match: RegExpExecArray | null = null
//   const matches: { term: string; index: number }[] = []
//   while (null !== (match = reg.exec(text))) {
//     matches.push({ term: match[0], index: match.index })
//   }
//   return matches
// }

function cleanContent(content: string): string {
  const pos = note.matches[0]?.offset ?? -1
  if (pos > -1) {
    const from = Math.max(0, pos - surroundLen)
    const to = Math.min(content.length - 1, pos + surroundLen)
    content =
      (from > 0 ? "…" : "") +
      content.slice(from, to).trim() +
      (to < content.length - 1 ? "…" : "")
  }
  return escapeHTML(content)
}

$: reg = stringsToRegex(note.foundWords)
$: matches = getMatches(note.content, reg)
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
    <!-- {@html note.basename.replace(reg, highlighter)} -->
    {@html note.basename}
  </span>

  <span class="omnisearch-result__counter">
    {matches.length}&nbsp;{matches.length > 1 ? "matches" : "match"}
  </span>
  <div class="omnisearch-result__body">
    {@html cleanedContent.replace(reg, highlighter)}
  </div>
</div>
