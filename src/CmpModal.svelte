<script lang="ts">
import { onMount, tick } from "svelte"
import CmpInput from "./CmpInput.svelte"
import CmpNoteInternalResult from "./CmpNoteInternalResult.svelte"
import CmpNoteResult from "./CmpNoteResult.svelte"
import type { ResultNote } from "./globals"
import { openNote } from "./notes"
import { getSuggestions } from "./search"
import {
  inFileSearch,
  modal,
  plugin,
  resultNotes,
  searchQuery,
  selectedNote,
} from "./stores"

$: firstResult = $resultNotes[0]

searchQuery.subscribe(async (q) => {
  // If we're in "single file" mode, the search results array
  // will contain a single result, related to this file
  const results = $inFileSearch
    ? getSuggestions(q, { singleFile: $inFileSearch })
    : getSuggestions(q)

  console.log(results)

  // Search on the whole vault
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
  // console.log(event.detail)
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

<div class="modal-title">Omnisearch</div>
<CmpInput
on:enter={onInputEnter}
on:shift-enter={onInputShiftEnter}
on:ctrl-enter={onInputCtrlEnter}
/>

<div class="modal-content">
  <div class="prompt-results">
    {#if $inFileSearch}
      <!-- In-file results -->
      {#if firstResult}
        {#each firstResult.matches as match}
          <CmpNoteInternalResult {match} />
        {/each}
      {:else}
        We found 0 result for your search here.
      {/if}
    {:else}
      <!-- Multi-files results -->
      {#each $resultNotes as result}
        <CmpNoteResult selected={result === $selectedNote} note={result} />
      {/each}
    {/if}
  </div>
  <div class="prompt-instructions">
    <div class="prompt-instruction">
      <span class="prompt-instruction-command">↑↓</span><span>to navigate</span>
    </div>
    <div class="prompt-instruction">
      <span class="prompt-instruction-command">↵</span><span>to open</span>
    </div>
    <div class="prompt-instruction">
      <span class="prompt-instruction-command">ctrl ↵</span>
      <span>to open in a new pane</span>
    </div>
    <div class="prompt-instruction">
      <span class="prompt-instruction-command">shift ↵</span>
      <span>to create</span>
    </div>
    <div class="prompt-instruction">
      <span class="prompt-instruction-command">esc</span><span>to dismiss</span>
    </div>
  </div>
</div>
