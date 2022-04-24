<script lang="ts" context="module">
let lastSearch = ""
</script>

<script lang="ts">
import InputSearch from "./InputSearch.svelte"
import ResultIemVault from "./ResultItemVault.svelte"
import {
  eventBus,
  excerptAfter,
  type ResultNote,
  type SearchMatch,
} from "../globals"
import { loopIndex } from "../utils"
import { onDestroy, onMount, tick } from "svelte"
import { MarkdownView } from "obsidian"
import { getSuggestions } from "../search"
import ModalContainer from "./ModalContainer.svelte"
import type { OmnisearchInFileModal, OmnisearchVaultModal } from "src/modals"

export let modal: OmnisearchInFileModal
export let parent: OmnisearchVaultModal | null = null
export let singleFilePath = ""
export let searchQuery: string

let groupedOffsets: number[] = []
let selectedIndex = 0
let note: ResultNote | null = null

onMount(() => {
  searchQuery = lastSearch
  eventBus.disable("vault")

  eventBus.on("infile", "enter", openSelection)
  eventBus.on("infile", "arrow-up", () => moveIndex(-1))
  eventBus.on("infile", "arrow-down", () => moveIndex(1))
})

onDestroy(() => {
  eventBus.enable("vault")
})

$: {
  if (searchQuery) {
    note = getSuggestions(searchQuery, { singleFilePath })[0] ?? null
    lastSearch = searchQuery
  }
  selectedIndex = 0
  scrollIntoView()
}

$: {
  if (note) {
    const groups = getGroups(note.matches)
    groupedOffsets = groups.map((group) =>
      Math.round((group.first()!.offset + group.last()!.offset) / 2)
    )
    // console.log(groups)
    // console.log(groupedOffsets)
  }
}

/**
 * Group together close
 */
function getGroups(matches: SearchMatch[]): SearchMatch[][] {
  const groups: SearchMatch[][] = []
  let lastOffset = -1
  while (true) {
    const group = getGroupedMatches(matches, lastOffset, excerptAfter)
    if (!group.length) break
    lastOffset = group.last()!.offset
    groups.push(group)
  }
  return groups
}

function getGroupedMatches(
  matches: SearchMatch[],
  offsetFrom: number,
  maxLen: number
): SearchMatch[] {
  const first = matches.find((m) => m.offset > offsetFrom)
  if (!first) return []
  return matches.filter(
    (m) => m.offset > offsetFrom && m.offset <= first.offset + maxLen
  )
}

function moveIndex(dir: 1 | -1): void {
  selectedIndex = loopIndex(selectedIndex + dir, groupedOffsets.length)
  scrollIntoView()
}

function scrollIntoView(): void {
  tick().then(() => {
    const elem = document.querySelector(`[data-result-id="${selectedIndex}"]`)
    elem?.scrollIntoView({ behavior: "auto", block: "nearest" })
  })
}

async function openSelection(): Promise<void> {
  // TODO: clean me, merge with notes.openNote()
  if (note) {
    modal.close()
    if (parent) parent.close()

    await app.workspace.openLinkText(note.path, "")
    const view = app.workspace.getActiveViewOfType(MarkdownView)
    if (!view) {
      throw new Error("OmniSearch - No active MarkdownView")
    }

    const offset = groupedOffsets[selectedIndex] ?? 0
    const pos = view.editor.offsetToPos(offset)
    pos.ch = 0
    view.editor.setCursor(pos)
    view.editor.scrollIntoView({
      from: { line: pos.line - 10, ch: 0 },
      to: { line: pos.line + 10, ch: 0 },
    })
  }
}
</script>

<div class="modal-title">Omnisearch - File</div>
<InputSearch value={searchQuery} on:input={(e) => (searchQuery = e.detail)} />

<ModalContainer>
  <div class="prompt-results">
    {#if groupedOffsets.length && note}
      {#each groupedOffsets as offset, i}
        <ResultIemVault
          {offset}
          {note}
          index={i}
          selected={i === selectedIndex}
          on:mousemove={(e) => (selectedIndex = i)}
          on:click={openSelection}
        />
      {/each}
    {:else}
      <center> We found 0 result for your search here. </center>
    {/if}
  </div>
</ModalContainer>
<div class="prompt-instructions">
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↑↓</span><span>to navigate</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↵</span><span>to open</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">esc</span>
    {#if !!parent}
      <span>to go back to Vault Search</span>
    {:else}
      <span>to dismiss</span>
    {/if}
  </div>
</div>
