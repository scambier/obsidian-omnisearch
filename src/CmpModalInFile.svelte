<script lang="ts">
import CmpInput from "./CmpInput.svelte"
import CmpResultInFile from "./CmpResultInFile.svelte"
import { excerptAfter, type SearchMatch } from "./globals"
import { modal, plugin, resultNotes } from "./stores"
import { loopIndex } from "./utils"
import { tick } from "svelte"
import { MarkdownView } from "obsidian"
import CmpModalVault from "./CmpModalVault.svelte"
import { OmnisearchModal } from "./modal"

export let canGoBack = false

let matches: SearchMatch[] = []
let groupedOffsets: number[] = []
let selectedIndex = 0

$: note = $resultNotes[0]
$: {
  if (note) {
    matches = note.matches
    const groups = getGroups()
    groupedOffsets = groups.map((group) =>
      Math.round((group.first()!.offset + group.last()!.offset) / 2)
    )
    // console.log(groups)
    // console.log(groupedOffsets)
  }
}
$: {
  if (canGoBack) {
    $modal.onClose = () => {
      if (canGoBack) {
        new OmnisearchModal($plugin).open()
      }
    }
  }
}

/**
 * Group together close
 */
function getGroups(): SearchMatch[][] {
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
    const elem = document.querySelector(`[data-item-id="${selectedIndex}"]`)
    elem?.scrollIntoView({ behavior: "auto", block: "nearest" })
  })
}

function openSelection(): void {
  // TODO: clean me, merge with notes.openNote()
  if (note) {
    $plugin.app.workspace.openLinkText(note.path, "")
    const view = $plugin.app.workspace.getActiveViewOfType(MarkdownView)
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
    $modal.close()
  }
}
</script>

<div class="modal-title">Omnisearch - File</div>
<CmpInput
  on:enter={openSelection}
  on:arrow-up={() => moveIndex(-1)}
  on:arrow-down={() => moveIndex(1)}
/>

<div class="modal-content">
  <div class="prompt-results">
    {#if groupedOffsets.length && note}
      {#each groupedOffsets as offset, i}
        <CmpResultInFile
          {offset}
          {note}
          index={i}
          selected={i === selectedIndex}
          on:hover={(e) => (selectedIndex = i)}
          on:click={openSelection}
        />
      {/each}
    {:else}
      We found 0 result for your search here.
    {/if}
  </div>
</div>
<div class="prompt-instructions">
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↑↓</span><span>to navigate</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↵</span><span>to open</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">esc</span>
    {#if canGoBack}
      <span>to go back to Vault Search</span>
    {:else}
      <span>to dismiss</span>
    {/if}
  </div>
</div>
