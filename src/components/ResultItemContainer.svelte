<script lang="ts">
  import GlyphAddNote from './GlyphAddNote.svelte'

  export let id: string
  export let selected = false
  export let glyph = false
  export let cssClass = ''
</script>

<div
  data-result-id={id}
  class="suggestion-item omnisearch-result {cssClass}"
  class:is-selected={selected}
  on:mousemove
  on:click
  on:keypress
  on:auxclick>
  {#if glyph}
    <GlyphAddNote />
  {/if}
  <slot />
</div>
