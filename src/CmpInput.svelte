<script lang="ts">
import { debounce } from "obsidian"
import { createEventDispatcher, onMount, tick } from "svelte"

export let value = ''
const dispatch = createEventDispatcher()

let elInput: HTMLInputElement

onMount(async () => {
  await tick()
  elInput.focus()
  // elInput.value = $searchQuery
  elInput.select()
})

const debouncedOnInput = debounce(() => {
  dispatch("input", value)
}, 100)

function moveNoteSelection(ev: KeyboardEvent): void {
  switch (ev.key) {
    case "ArrowDown":
      ev.preventDefault()
      dispatch("arrow-down")
      break
    case "ArrowUp":
      ev.preventDefault()
      dispatch("arrow-up")
      break

    case "Enter":
      ev.preventDefault()
      if (ev.ctrlKey || ev.metaKey) {
        // Open in a new pane
        dispatch("ctrl-enter")
      } else if (ev.shiftKey) {
        // Create a new note
        dispatch("shift-enter")
      } else if (ev.altKey) {
        // Expand in-note results
        dispatch("alt-enter")
      } else {
        // Open in current pane
        dispatch("enter")
      }
      break
  }
}
</script>

<input
  bind:value
  bind:this={elInput}
  on:input={debouncedOnInput}
  on:keydown={moveNoteSelection}
  type="text"
  class="prompt-input"
  placeholder="Type to search through your notes"
  spellcheck="false"
/>
