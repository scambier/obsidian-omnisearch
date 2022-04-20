<script lang="ts">
import { createEventDispatcher } from "svelte"
import { excerptAfter, excerptBefore, type ResultNote } from "./globals"
import { escapeHTML, highlighter, stringsToRegex } from "./utils"

const dispatch = createEventDispatcher()
export let offset: number
export let note: ResultNote
export let index = 0
export let selected = false

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

<div
  class="suggestion-item omnisearch-result"
  data-item-id={index}
  class:is-selected={selected}
  on:mousemove={(e) => dispatch("hover")}
  on:click={(e) => dispatch("click")}
>
  <div class="omnisearch-result__body">
    {@html cleanContent(note?.content ?? "").replace(reg, highlighter)}
  </div>
</div>
