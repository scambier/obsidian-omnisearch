<script lang="ts">
import { debounce } from "obsidian";
import { createEventDispatcher, onMount, tick } from "svelte"
import { searchQuery, selectedNote } from "./stores"

let elInput: HTMLInputElement
let inputValue: string
const dispatch = createEventDispatcher()

onMount(async () => {
  await tick()
  elInput.focus()
  elInput.value = $searchQuery
  elInput.select()
})

const debouncedOnInput = debounce(() => $searchQuery = inputValue, 100)

function moveNoteSelection(ev: KeyboardEvent): void {
  switch (ev.key) {
    case "ArrowDown":
      ev.preventDefault()
      selectedNote.next()
      break
    case "ArrowUp":
      ev.preventDefault()
      selectedNote.previous()
      break
    // case "ArrowLeft":
    //   ev.preventDefault()
    //   break
    // case "ArrowRight":
    //   ev.preventDefault()
    //   break

    case "Enter":
      ev.preventDefault()
      if (ev.ctrlKey || ev.metaKey) {
        // Open in a new pane
        dispatch("ctrl-enter", $selectedNote)
      } else if (ev.shiftKey) {
        // Create a new note
        dispatch("shift-enter", $selectedNote)
      } else if (ev.altKey) {
        // Create a new note
        dispatch("alt-enter", $selectedNote)
      } else {
        // Open in current pane
        dispatch("enter", $selectedNote)
      }
      break
  }

  // Scroll selected note into view when selecting with keyboard
  if ($selectedNote) {
    const elem = document.querySelector(
      `[data-note-id="${$selectedNote.path}"]`
    )
    elem?.scrollIntoView({ behavior: "auto", block: "nearest" })
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
