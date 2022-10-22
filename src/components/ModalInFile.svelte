<script lang="ts" context="module">
  let lastSearch = ''
</script>

<script lang="ts">
  import InputSearch from './InputSearch.svelte'
  import {
    eventBus,
    excerptAfter,
    type ResultNote,
    type SearchMatch,
  } from 'src/globals'
  import { loopIndex } from 'src/tools/utils'
  import { onDestroy, onMount, tick } from 'svelte'
  import { MarkdownView } from 'obsidian'
  import * as Search from 'src/search/search'
  import ModalContainer from './ModalContainer.svelte'
  import { OmnisearchInFileModal, OmnisearchVaultModal } from 'src/components/modals'
  import ResultItemInFile from './ResultItemInFile.svelte'
  import { Query } from 'src/search/query'
  import { openNote } from 'src/tools/notes'
  import { saveSearchHistory } from '../search/search-history'

  export let modal: OmnisearchInFileModal
  export let parent: OmnisearchVaultModal | null = null
  export let singleFilePath = ''
  export let searchQuery: string

  let groupedOffsets: number[] = []
  let selectedIndex = 0
  let note: ResultNote | undefined
  let query: Query

  onMount(() => {
    if (lastSearch && !searchQuery) {
      searchQuery = lastSearch
    }
    eventBus.enable('infile')

    eventBus.on('infile', 'enter', openSelection)
    eventBus.on('infile', 'arrow-up', () => moveIndex(-1))
    eventBus.on('infile', 'arrow-down', () => moveIndex(1))
    eventBus.on('infile', 'tab', switchToVaultModal)
  })

  onDestroy(() => {
    eventBus.disable('infile')
  })

  $: (async () => {
    if (searchQuery) {
      query = new Query(searchQuery)
      note = (await Search.getSuggestions(query, { singleFilePath }))[0] ?? null
      lastSearch = searchQuery
    }
    selectedIndex = 0
    scrollIntoView()
  })()

  $: {
    if (note) {
      const groups = getGroups(note.matches)
      groupedOffsets = groups.map(group =>
        Math.round((group.first()!.offset + group.last()!.offset) / 2)
      )
      // console.log(groups)
      // console.log(groupedOffsets)
    }
  }

  /**
   * Group together close matches to reduce the number of results
   */
  function getGroups(matches: SearchMatch[]): SearchMatch[][] {
    const groups: SearchMatch[][] = []
    let lastOffset = -1
    let count = 0 // TODO: FIXME: this is a hack to avoid infinite loops
    while (true) {
      const group = getGroupedMatches(matches, lastOffset, excerptAfter)
      if (!group.length) break
      lastOffset = group.last()!.offset
      groups.push(group)
      if (++count > 100) break
    }
    return groups
  }

  function getGroupedMatches(
    matches: SearchMatch[],
    offsetFrom: number,
    maxLen: number
  ): SearchMatch[] {
    const first = matches.find(m => m.offset > offsetFrom)
    if (!first) return []
    return matches.filter(
      m => m.offset > offsetFrom && m.offset <= first.offset + maxLen
    )
  }

  function moveIndex(dir: 1 | -1): void {
    selectedIndex = loopIndex(selectedIndex + dir, groupedOffsets.length)
    scrollIntoView()
  }

  async function scrollIntoView(): Promise<void> {
    await tick()
    const elem = document.querySelector(`[data-result-id="${selectedIndex}"]`)
    elem?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
  }

  async function openSelection(
    evt?: MouseEvent | KeyboardEvent
  ): Promise<void> {
    if (note) {
      await saveSearchHistory()
      modal.close()
      if (parent) parent.close()

      // Open (or switch focus to) the note
      await openNote(note, evt?.ctrlKey)

      // Move cursor to the match
      const view = app.workspace.getActiveViewOfType(MarkdownView)
      if (!view) {
        // Not an editable document, so no cursor to place
        return
        // throw new Error('OmniSearch - No active MarkdownView')
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

  function switchToVaultModal(): void {
    new OmnisearchVaultModal(app).open()
    modal.close()
  }
</script>

<InputSearch
  value="{searchQuery}"
  on:input="{e => (searchQuery = e.detail)}"
  placeholder="Omnisearch - File" />

<ModalContainer>
  {#if groupedOffsets.length && note}
    {#each groupedOffsets as offset, i}
      <ResultItemInFile
        offset="{offset}"
        note="{note}"
        index="{i}"
        selected="{i === selectedIndex}"
        on:mousemove="{_e => (selectedIndex = i)}"
        on:click="{openSelection}" />
    {/each}
  {:else}
    <div style="text-align: center;">
      We found 0 result for your search here.
    </div>
  {/if}
</ModalContainer>

<div class="prompt-instructions">
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↑↓</span><span>to navigate</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↵</span><span>to open</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↹</span>
    <span>to switch to Vault Search</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">esc</span>
    {#if !!parent}
      <span>to go back to Vault Search</span>
    {:else}
      <span>to close</span>
    {/if}
  </div>
</div>
