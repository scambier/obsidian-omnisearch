<script lang="ts">
import { createEventDispatcher } from "svelte"

export let id: string
export let selected = false
</script>

<div
  data-result-id={id}
  class="suggestion-item omnisearch-result"
  class:is-selected={selected}
  on:mousemove
  on:click
  on:auxclick
>
  <slot />
</div>
