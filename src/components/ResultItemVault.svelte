<script lang="ts">
import type { Query } from "src/query";
import type { ResultNote } from "../globals"
import { getMatches } from "../search"
import { highlighter, makeExcerpt, stringsToRegex } from "../utils"
import ResultItemContainer from "./ResultItemContainer.svelte"

export let selected = false
export let note: ResultNote

$: reg = stringsToRegex(note.foundWords)
$: matches = getMatches(note.content, reg)
$: cleanedContent = makeExcerpt(note.content, note.matches[0]?.offset ?? -1)
</script>

<ResultItemContainer id={note.path} {selected} on:mousemove on:click>
  <span class="omnisearch-result__title">
    {@html note.basename.replace(reg, highlighter)}
  </span>

  <span class="omnisearch-result__counter">
    {matches.length}&nbsp;{matches.length > 1 ? "matches" : "match"}
  </span>
  <div class="omnisearch-result__body">
    {@html cleanedContent.replace(reg, highlighter)}
  </div>
</ResultItemContainer>
