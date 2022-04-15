<script lang="ts">
import { onMount, tick } from 'svelte'
import { searchQuery } from './stores'

let input: HTMLInputElement

onMount(async () => {
  await tick()
  input.focus()
})
</script>

<input
  bind:this={input}
  bind:value={$searchQuery}
  type="text"
  class="prompt-input"
  placeholder="Type to search through your notes"
/>
