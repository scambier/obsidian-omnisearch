<script lang="ts">
import type { IndexedNote, SearchMatch } from "./globals"
import { indexedNotes, inFileSearch } from "./stores"
import { escapeHTML } from "./utils";

export let match: SearchMatch

let note: IndexedNote | null = null
inFileSearch.subscribe((file) => {
  if (file) {
    note = indexedNotes.get(file.path) ?? null
  }
})

function cleanContent(content: string): string {
  const pos = match.offset ?? -1
  if (pos > -1) {
    const surroundLen = 180
    const from = Math.max(0, pos - surroundLen)
    const to = Math.min(content.length - 1, pos + surroundLen)
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
    {@html cleanContent(note?.content ?? '')}
  </div>
</div>
