<script lang="ts" context="module">
let lastSearch = ""
</script>

<script lang="ts">
import { TFile } from "obsidian"
import { onMount, tick } from "svelte"
import CmpInput from "./CmpInput.svelte"
import CmpResultNote from "./CmpResultNote.svelte"
import { eventBus, type ResultNote } from "./globals"
import { ModalInFile, type ModalVault } from "./modal"
import { createNote, openNote } from "./notes"
import { getSuggestions } from "./search"
import { loopIndex } from "./utils"

export let modal: ModalVault
let selectedIndex = 0
let searchQuery: string
let resultNotes: ResultNote[] = []
$: selectedNote = resultNotes[selectedIndex]

$: {
  if (searchQuery) {
    resultNotes = getSuggestions(searchQuery)
    lastSearch = searchQuery
  }
  selectedIndex = 0
  scrollIntoView()
}

onMount(() => {
  searchQuery = lastSearch
  eventBus.on("vault", "enter", onInputEnter)
  eventBus.on("vault", "shift-enter", onInputShiftEnter)
  eventBus.on("vault", "ctrl-enter", onInputCtrlEnter)
  eventBus.on("vault", "alt-enter", onInputAltEnter)
  eventBus.on("vault", "arrow-up", () => moveIndex(-1))
  eventBus.on("vault", "arrow-down", () => moveIndex(1))
})

function onClick() {
  if (!selectedNote) return
  openNote(selectedNote)
  modal.close()
}

function onInputEnter(): void {
  // console.log(event.detail)
  if (!selectedNote) return
  openNote(selectedNote)
  modal.close()
}

function onInputCtrlEnter(): void {
  if (!selectedNote) return
  openNote(selectedNote, true)
  modal.close()
}

async function onInputShiftEnter(): Promise<void> {
  await createNote(searchQuery)
  modal.close()
}

function onInputAltEnter(): void {
  if (selectedNote) {
    const file = app.vault.getAbstractFileByPath(selectedNote.path)
    if (file && file instanceof TFile) {
      // modal.close()
      new ModalInFile(app, file, searchQuery, modal).open()
    }
  }
}

function moveIndex(dir: 1 | -1): void {
  selectedIndex = loopIndex(selectedIndex + dir, resultNotes.length)
  scrollIntoView()
}

function scrollIntoView(): void {
  tick().then(() => {
    if (selectedNote) {
      const elem = document.querySelector(
        `[data-note-id="${selectedNote.path}"]`
      )
      elem?.scrollIntoView({ behavior: "auto", block: "nearest" })
    }
  })
}
</script>

<div class="modal-title">Omnisearch - Vault</div>
<CmpInput value={lastSearch} on:input={(e) => (searchQuery = e.detail)} />

<div class="modal-content">
  <div class="prompt-results">
    {#each resultNotes as result, i}
      <CmpResultNote
        selected={i === selectedIndex}
        note={result}
        on:hover={(e) => (selectedIndex = i)}
        on:click={onClick}
      />
    {/each}
    {#if !resultNotes.length && searchQuery}
      <center> We found 0 result for your search here. </center>
    {/if}
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
