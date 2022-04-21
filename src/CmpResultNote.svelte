<script lang="ts">
import { createEventDispatcher } from "svelte"
import type { ResultNote } from "./globals"
import { getMatches } from "./search"
import { highlighter, makeExcerpt, stringsToRegex } from "./utils"

const dispatch = createEventDispatcher()
export let selected = false
export let note: ResultNote

$: reg = stringsToRegex(note.foundWords)
$: matches = getMatches(note.content, reg)
$: cleanedContent = makeExcerpt(note.content, note.matches[0]?.offset ?? -1)
</script>

<div
  data-note-id={note.path}
  class="suggestion-item omnisearch-result"
  class:is-selected={selected}
  on:mousemove={(e) => dispatch("hover")}
  on:click={(e) => dispatch("click")}
>
  <span class="omnisearch-result__title">
    {@html note.basename.replace(reg, highlighter)}
  </span>

  <span class="omnisearch-result__counter">
    {matches.length}&nbsp;{matches.length > 1 ? "matches" : "match"}
  </span>
  <div class="omnisearch-result__body">
    {@html cleanedContent.replace(reg, highlighter)}
  </div>
</div>
