<script lang="ts">
  import { Platform } from 'obsidian'
  import { longpress } from '../tools/longpress'
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
  role="button"
  tabindex="0"
  use:longpress={{ enabled: Platform.isMobile }}
  on:mousemove
  on:click
  on:keypress
  on:auxclick
  on:longpress>
  {#if glyph}
    <GlyphAddNote />
  {/if}
  <slot />
</div>
