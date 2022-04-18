<script lang="ts">
import CmpInput from "./CmpInput.svelte"
import CmpNoteInternalResult from "./CmpInfileResult.svelte"
import { surroundLen, type ResultNote, type SearchMatch } from "./globals"
import { resultNotes } from "./stores"
import type { SearchResult } from "minisearch"
import { stringsToRegex } from "./utils"

$: firstResult = $resultNotes[0]
$: matches = firstResult?.matches ?? []
$: groupedMatches = (() => {
  const groups = getGroups()
  return groups.map((group) => ({
    match: "",
    offset: (group.first()!.offset + group.last()!.offset) / 2,
  }))
})()

/**
 * Group together close
 */
function getGroups(): SearchMatch[][] {
  const groups: SearchMatch[][] = []
  let lastOffset = -1
  while (true) {
    const group = getGroupedMatches(matches, lastOffset, surroundLen)
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
  const first = matches.find((m) => m.offset >= offsetFrom)
  if (!first) return []
  return matches.filter(
    (m) => m.offset > offsetFrom && m.offset <= first.offset + maxLen
  )
}

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
    {#if groupedMatches.length}
      {#each groupedMatches as match}
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
