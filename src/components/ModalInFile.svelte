<script lang="ts">
  import InputSearch from './InputSearch.svelte'
  import {
    Action,
    eventBus,
    excerptAfter,
    type ResultNote,
    type SearchMatch,
  } from 'src/globals'
  import { getCtrlKeyLabel, loopIndex } from 'src/tools/utils'
  import { onDestroy, onMount, tick } from 'svelte'
  import { MarkdownView, App } from 'obsidian'
  import ModalContainer from './ModalContainer.svelte'
  import {
    OmnisearchInFileModal,
    OmnisearchVaultModal,
  } from 'src/components/modals'
  import ResultItemInFile from './ResultItemInFile.svelte'
  import { Query } from 'src/search/query'
  import { openNote } from 'src/tools/notes'
  import { searchEngine } from 'src/search/omnisearch'

  export let modal: OmnisearchInFileModal
  export let parent: OmnisearchVaultModal | null = null
  export let singleFilePath = ''
  export let previousQuery: string | undefined
  export let app: App

  let searchQuery: string
  let groupedOffsets: number[] = []
  let selectedIndex = 0
  let note: ResultNote | undefined
  let query: Query

  $: searchQuery = previousQuery ?? ''

  onMount(() => {
    eventBus.enable('infile')

    eventBus.on('infile', Action.Enter, openSelection)
    eventBus.on('infile', Action.OpenInNewPane, openSelectionInNewTab)
    eventBus.on('infile', Action.ArrowUp, () => moveIndex(-1))
    eventBus.on('infile', Action.ArrowDown, () => moveIndex(1))
    eventBus.on('infile', Action.Tab, switchToVaultModal)
  })

  onDestroy(() => {
    eventBus.disable('infile')
  })

  $: (async () => {
    if (searchQuery) {
      query = new Query(searchQuery)
      note =
        (
          await searchEngine.getSuggestions(query, {
            singleFilePath,
          })
        )[0] ?? null
    }
    selectedIndex = 0
    await scrollIntoView()
  })()

  $: {
    if (note) {
      const groups = getGroups(note.matches)
      groupedOffsets = groups.map(group =>
        Math.round((group.first()!.offset + group.last()!.offset) / 2)
      )
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

  async function openSelectionInNewTab(): Promise<void> {
    return openSelection(true)
  }

  async function openSelection(newTab = false): Promise<void> {
    if (note) {
      modal.close()
      if (parent) parent.close()

      // Open (or switch focus to) the note
      await openNote(note, newTab)

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
    new OmnisearchVaultModal(app, searchQuery ?? previousQuery).open()
    modal.close()
  }
</script>

<InputSearch
  on:input="{e => (searchQuery = e.detail)}"
  placeholder="Omnisearch - File"
  initialValue="{previousQuery}" />

<ModalContainer>
  {#if groupedOffsets.length && note}
    {#each groupedOffsets as offset, i}
      <ResultItemInFile
        offset="{offset}"
        note="{note}"
        index="{i}"
        selected="{i === selectedIndex}"
        on:mousemove="{_e => (selectedIndex = i)}"
        on:click="{evt => openSelection(evt.ctrlKey)}"
        on:auxclick="{evt => {
          if (evt.button == 1) openSelection(true)
        }}" />
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
    <span class="prompt-instruction-command">tab</span>
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

  <div class="prompt-instruction">
    <span class="prompt-instruction-command">{getCtrlKeyLabel()} ↵</span>
    <span>to open in a new pane</span>
  </div>
</div>
