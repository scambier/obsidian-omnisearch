<script lang="ts">
import { debounce } from "obsidian"
import { createEventDispatcher, onMount, tick } from "svelte"

export let value = ""
const dispatch = createEventDispatcher()

let elInput: HTMLInputElement

onMount(async () => {
  await tick()
  elInput.focus()
  elInput.select()
})

const debouncedOnInput = debounce(() => {
  dispatch("input", value)
}, 100)
</script>

<input
  bind:value
  bind:this={elInput}
  on:input={debouncedOnInput}
  type="text"
  class="prompt-input"
  placeholder="Type to search through your notes"
  spellcheck="false"
/>
