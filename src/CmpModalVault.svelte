<script lang="ts">
import { TFile } from "obsidian"
import { tick } from "svelte"
import CmpInput from "./CmpInput.svelte"
import CmpResultNote from "./CmpResultNote.svelte"
import type { ResultNote } from "./globals"
import { OmnisearchModal } from "./modal"
import { openNote } from "./notes"
import { modal, plugin, resultNotes, searchQuery } from "./stores"
import { loopIndex } from "./utils"

let selectedIndex = 0
$: selectedNote = $resultNotes[selectedIndex]!

searchQuery.subscribe((q) => {
  selectedIndex = 0
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

function onClick() {
  openNote(selectedNote)
  $modal.close()
}

function onInputEnter(): void {
  // console.log(event.detail)
  openNote(selectedNote)
  $modal.close()
}

function onInputCtrlEnter(): void {
  openNote(selectedNote, true)
  $modal.close()
}

function onInputShiftEnter(): void {
  createOrOpenNote(selectedNote)
  $modal.close()
}

function onInputAltEnter(): void {
  if (selectedNote) {
    const file = $plugin.app.vault.getAbstractFileByPath(selectedNote.path)
    if (file && file instanceof TFile) {
      // $modal.close()
      new OmnisearchModal($plugin, file, true).open()
    }
  }
}

function moveIndex(dir: 1 | -1): void {
  selectedIndex = loopIndex(selectedIndex + dir, $resultNotes.length)
  scrollIntoView()
}

function scrollIntoView(): void {
  if (selectedNote) {
    tick().then(() => {
      const elem = document.querySelector(
        `[data-note-id="${selectedNote.path}"]`
      )
      elem?.scrollIntoView({ behavior: "auto", block: "nearest" })
    })
  }
}
</script>

<div class="modal-title">Omnisearch - Vault</div>
<CmpInput
  on:enter={onInputEnter}
  on:shift-enter={onInputShiftEnter}
  on:ctrl-enter={onInputCtrlEnter}
  on:alt-enter={onInputAltEnter}
  on:arrow-up={() => moveIndex(-1)}
  on:arrow-down={() => moveIndex(1)}
/>

<div class="modal-content">
  <div class="prompt-results">
    {#each $resultNotes as result, i}
      <CmpResultNote
        selected={i === selectedIndex}
        note={result}
        on:hover={(e) => (selectedIndex = i)}
        on:click={onClick}
      />
    {/each}
  </div>
</div>
<div class="prompt-instructions">
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↑↓</span><span>to navigate</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">alt ↵</span>
    <span>to expand in-note results</span>
  </div>
  <br />
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
