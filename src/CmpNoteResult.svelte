<script lang="ts">
import type { ResultNote } from "./globals"

export let selected = false
export let note: ResultNote
</script>

<div
  data-note-id={note.path}
  class="suggestion-item omnisearch-result"
  class:is-selected={selected}
>
  <span class="omnisearch-result__title">
    {@html note.basename}
  </span>
  <span class="omnisearch-result__counter">
    {note.matches.length}&nbsp;{note.matches.length > 1 ? "matches" : "match"}
  </span>
  <div class="omnisearch-result__body">
    {@html note.content}
  </div>
</div>
