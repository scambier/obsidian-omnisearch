<script lang="ts">
import { tick } from "svelte"
import CmpInput from "./CmpInput.svelte"
import CmpNoteResult from "./CmpNoteResult.svelte"
import type { ResultNote } from "./globals"
import { openNote } from "./notes"
import { getSuggestions } from "./search"
import {
  modal,
  plugin,
  resultNotes,
  searchQuery,
  selectedNote,
} from "./stores"

searchQuery.subscribe(async (q) => {
  const results = getSuggestions(q)
  resultNotes.set(results)
  const firstResult = results[0]
  if (firstResult) {
    await tick()
    selectedNote.set(firstResult)
  }
})

async function createOrOpenNote(item: ResultNote): Promise<void> {
  try {
    const file = await $plugin.app.vault.create(
      $searchQuery + ".md",
      "# " + $searchQuery
    )
    await $plugin.app.workspace.openLinkText(file.path, "")
  } catch (e) {
    if (e instanceof Error && e.message === "File already exists.") {
      // Open the existing file instead of creating it
      await openNote(item)
    } else {
      console.error(e)
    }
  }
}

function onInputEnter(event: CustomEvent<ResultNote>): void {
  console.log(event.detail)
  openNote(event.detail)
  $modal.close()
}

function onInputCtrlEnter(event: CustomEvent<ResultNote>): void {
  openNote(event.detail, true)
  $modal.close()
}

function onInputShiftEnter(event: CustomEvent<ResultNote>): void {
  createOrOpenNote(event.detail)
  $modal.close()
}
</script>

<CmpInput
  on:enter={onInputEnter}
  on:shift-enter={onInputShiftEnter}
  on:ctrl-enter={onInputCtrlEnter}
/>

<div class="prompt-results">
  {#each $resultNotes as result}
    <CmpNoteResult selected={result === $selectedNote} note={result} />
  {/each}
</div>
<div class="prompt-instructions">
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↑↓</span><span>to navigate</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↵</span><span>to open</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">ctrl ↵</span><span
      >to open in a new pane</span
    >
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">shift ↵</span><span>to create</span
    >
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">esc</span><span>to dismiss</span>
  </div>
</div>
