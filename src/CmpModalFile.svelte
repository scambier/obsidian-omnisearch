<script lang="ts">
import CmpInput from "./CmpInput.svelte"
import CmpNoteInternalResult from "./CmpInfileResult.svelte"
import type { ResultNote } from "./globals"
import {
  resultNotes,
} from "./stores"

$: firstResult = $resultNotes[0]

function onInputEnter(event: CustomEvent<ResultNote>): void {
  // console.log(event.detail)
  // openNote(event.detail)
  // $modal.close()
}
</script>

<div class="modal-title">Omnisearch - File</div>
<CmpInput on:enter={onInputEnter} />

<div class="modal-content">
  <div class="prompt-results">
    {#if firstResult}
      {#each firstResult.matches as match}
        <CmpNoteInternalResult {match} />
      {/each}
    {:else}
      We found 0 result for your search here.
    {/if}
  </div>
  <div class="prompt-instructions">
    <div class="prompt-instruction">
      <span class="prompt-instruction-command">↑↓</span><span>to navigate</span>
    </div>
    <div class="prompt-instruction">
      <span class="prompt-instruction-command">↵</span><span>to open</span>
    </div>
    <!-- <div class="prompt-instruction">
      <span class="prompt-instruction-command">ctrl ↵</span>
      <span>to open in a new pane</span>
    </div>
    <div class="prompt-instruction">
      <span class="prompt-instruction-command">shift ↵</span>
      <span>to create</span>
    </div> -->
    <div class="prompt-instruction">
      <span class="prompt-instruction-command">esc</span><span>to dismiss</span>
    </div>
  </div>
</div>
