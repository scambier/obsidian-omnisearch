<script lang="ts">
import { createEventDispatcher, onMount, tick } from "svelte"
// import { throttle } from "lodash-es"
import { searchQuery, selectedNote } from "./stores"

let input: HTMLInputElement
const dispatch = createEventDispatcher()

onMount(async () => {
  await tick()
  input.focus()
})

selectedNote.subscribe((note) => {
  const elem = document.querySelector(`[data-note-id="${note?.path}"]`)
  elem?.scrollIntoView({ behavior: "auto", block: "nearest" })
})

// const throttledMoveNoteSelection = throttle(moveNoteSelection, 75)
function moveNoteSelection(ev: KeyboardEvent): void {
  switch (ev.key) {
    case "ArrowDown":
      selectedNote.next()
      ev.preventDefault()
      break
    case "ArrowUp":
      selectedNote.previous()
      ev.preventDefault()
      break
    case "ArrowLeft":
      break
    case "ArrowRight":
      break

    case "Enter":
      dispatch("enter", $selectedNote)
      break
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
