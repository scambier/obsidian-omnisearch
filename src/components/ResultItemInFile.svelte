<script lang="ts">
  import type { ResultNote } from '../globals'
  import {
    highlighterGroups,
    makeExcerpt,
    stringsToRegex,
  } from '../tools/utils'
  import ResultItemContainer from './ResultItemContainer.svelte'

  export let offset: number
  export let note: ResultNote
  export let index = 0
  export let selected = false

  $: reg = stringsToRegex(note.foundWords)
  $: cleanedContent = makeExcerpt(note?.content ?? '', offset)
</script>

<ResultItemContainer
  id="{index.toString()}"
  selected="{selected}"
  on:mousemove
  on:click>
  <div class="omnisearch-result__body">
    {@html cleanedContent.replace(reg, highlighterGroups)}
  </div>
</ResultItemContainer>
