<script lang="ts">
import { createEventDispatcher } from "svelte"
import type { ResultNote } from "./globals"
import { highlighter, makeExcerpt, stringsToRegex } from "./utils"

const dispatch = createEventDispatcher()
export let offset: number
export let note: ResultNote
export let index = 0
export let selected = false

$: reg = stringsToRegex(note.foundWords)
</script>

<div
  class="suggestion-item omnisearch-result"
  data-item-id={index}
  class:is-selected={selected}
  on:mousemove={(e) => dispatch("hover")}
  on:click={(e) => dispatch("click")}
>
  <div class="omnisearch-result__body">
    {@html makeExcerpt(note?.content ?? "", offset).replace(reg, highlighter)}
  </div>
</div>
