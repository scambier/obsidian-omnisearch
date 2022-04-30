<script lang="ts" context="module">
let lastSearch = ""
</script>

<script lang="ts">
import { TFile } from "obsidian"
import { onMount, tick } from "svelte"
import InputSearch from "./InputSearch.svelte"
import ModalContainer from "./ModalContainer.svelte"
import { eventBus, type ResultNote } from "../globals"
import { createNote, openNote } from "../notes"
import { getSuggestions } from "../search"
import { loopIndex } from "../utils"
import { OmnisearchInFileModal, type OmnisearchVaultModal } from "src/modals"
import ResultItemVault from "./ResultItemVault.svelte"

export let modal: OmnisearchVaultModal
let selectedIndex = 0
let searchQuery: string
let resultNotes: ResultNote[] = []
$: selectedNote = resultNotes[selectedIndex]

$: if (searchQuery) {
  updateResults()
} else {
  resultNotes = []
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

async function updateResults() {
  resultNotes = await getSuggestions(searchQuery)
  lastSearch = searchQuery
  selectedIndex = 0
  scrollIntoView()
  // if (resultNotes.length) console.log(resultNotes[0])
}

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
      new OmnisearchInFileModal(app, file, searchQuery, modal).open()
    }
  }
}

function moveIndex(dir: 1 | -1): void {
  selectedIndex = loopIndex(selectedIndex + dir, resultNotes.length)
  scrollIntoView()
}

async function scrollIntoView(): Promise<void> {
  await tick()
  if (selectedNote) {
    const elem = document.querySelector(
      `[data-result-id="${selectedNote.path}"]`
    )
    elem?.scrollIntoView({ behavior: "auto", block: "nearest" })
  }
}
</script>

<div class="modal-title">Omnisearch - Vault</div>
<InputSearch value={lastSearch} on:input={(e) => (searchQuery = e.detail)} />

<ModalContainer>
  {#each resultNotes as result, i}
    <ResultItemVault
      selected={i === selectedIndex}
      note={result}
      on:mousemove={(e) => (selectedIndex = i)}
      on:click={onClick}
    />
  {/each}
  {#if !resultNotes.length && searchQuery}
    <center> We found 0 result for your search here. </center>
  {/if}
</ModalContainer>

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
