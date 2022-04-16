<script lang="ts">
import { createEventDispatcher, onMount, tick } from "svelte"
// import { throttle } from "lodash-es"
import { searchQuery, selectedNote } from "./stores"

let input: HTMLInputElement
const dispatch = createEventDispatcher()

onMount(async () => {
  await tick()
  input.focus()
  input.select()
})

// const throttledMoveNoteSelection = throttle(moveNoteSelection, 75)
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
    case "ArrowLeft":
      ev.preventDefault()
      break
    case "ArrowRight":
      ev.preventDefault()
      break

    case "Enter":
      ev.preventDefault()
      if (ev.ctrlKey || ev.metaKey) {
        // Open in a new pane
        dispatch("ctrl-enter", $selectedNote)
      } else if (ev.shiftKey) {
        // Create a new note
        dispatch("shift-enter", $selectedNote)
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
  bind:this={input}
  bind:value={$searchQuery}
  on:keydown={moveNoteSelection}
  type="text"
  class="prompt-input"
  placeholder="Type to search through your notes"
  spellcheck="false"
/>
