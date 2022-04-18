<script lang="ts">
import {
excerptAfter,
excerptBefore,
  type IndexedNote,
  type ResultNote,
  type SearchMatch,
} from "./globals"
import { indexedNotes, inFileSearch } from "./stores"
import { escapeHTML, highlighter, stringsToRegex } from "./utils"

export let offset: number
export let note: ResultNote

$: reg = stringsToRegex(note.foundWords)

function cleanContent(content: string): string {
  const pos = offset ?? -1
  if (pos > -1) {
    const from = Math.max(0, pos - excerptBefore)
    const to = Math.min(content.length - 1, pos + excerptAfter)
    content =
      (from > 0 ? "…" : "") +
      content.slice(from, to).trim() +
      (to < content.length - 1 ? "…" : "")
  }
  return escapeHTML(content)
}
</script>

<div class="suggestion-item omnisearch-result">
  <div class="omnisearch-result__body">
    {@html cleanContent(note?.content ?? "").replace(reg, highlighter)}
  </div>
</div>
