<script lang="ts">
  import { makeExcerpt, highlightText } from 'src/tools/text-processing'
  import type { ResultNote } from '../globals'
  import ResultItemContainer from './ResultItemContainer.svelte'
  import { cloneDeep } from 'lodash-es'

  export let offset: number
  export let note: ResultNote
  export let index = 0
  export let selected = false

  $: cleanedContent = makeExcerpt(note?.content ?? '', offset)
  $: matchesExcerpt = cloneDeep(note.matches)
</script>

<ResultItemContainer
  id="{index.toString()}"
  selected="{selected}"
  on:mousemove
  on:click
  on:auxclick>
  <div class="omnisearch-result__body">
    {@html highlightText(cleanedContent, matchesExcerpt)}
  </div>
</ResultItemContainer>
