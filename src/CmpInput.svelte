<script lang="ts">
import { debounce } from "obsidian"
import { createEventDispatcher, onMount, tick } from "svelte"
import { searchQuery } from "./stores"

let elInput: HTMLInputElement
let inputValue: string
const dispatch = createEventDispatcher()

onMount(async () => {
  await tick()
  elInput.focus()
  elInput.value = $searchQuery
  elInput.select()
})

const debouncedOnInput = debounce(() => ($searchQuery = inputValue), 100)

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
        // Create a new note
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
  bind:this={elInput}
  bind:value={inputValue}
  on:input={debouncedOnInput}
  on:keydown={moveNoteSelection}
  type="text"
  class="prompt-input"
  placeholder="Type to search through your notes"
  spellcheck="false"
/>
