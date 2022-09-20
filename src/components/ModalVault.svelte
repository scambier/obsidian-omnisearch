<script lang="ts">
  import { MarkdownView, Notice, TFile } from 'obsidian'
  import { onMount, onDestroy, tick } from 'svelte'
  import InputSearch from './InputSearch.svelte'
  import ModalContainer from './ModalContainer.svelte'
  import { eventBus, type ResultNote } from 'src/globals'
  import { createNote, openNote } from 'src/notes'
  import { getSuggestions, reindexNotes } from 'src/search'
  import { getCtrlKeyLabel, loopIndex } from 'src/utils'
  import { OmnisearchInFileModal, type OmnisearchVaultModal } from 'src/modals'
  import ResultItemVault from './ResultItemVault.svelte'
  import { Query } from 'src/query'
  import { saveSearchHistory, searchHistory } from 'src/search-history'
  import { SearchContextType, settings } from 'src/settings'

  export let modal: OmnisearchVaultModal
  let selectedIndex = 0
  let historySearchIndex = 0
  let searchQuery: string
  let resultNotes: ResultNote[] = []
  let query: Query
  $: selectedNote = resultNotes[selectedIndex]
  // $: lastSearch = lastSearches[lastSearchIndex]

  $: if (searchQuery) {
    updateResults()
  } else {
    resultNotes = []
  }

  onMount(async () => {
    console.log('mount')
    await reindexNotes()
    searchQuery = searchHistory[historySearchIndex]
    eventBus.enable('vault')
    eventBus.on('vault', 'enter', openNoteAndCloseModal)
    eventBus.on('vault', 'create-note', createNoteAndCloseModal)
    eventBus.on('vault', 'open-in-new-pane', openNoteInNewPane)
    eventBus.on('vault', 'insert-link', insertLink)
    eventBus.on('vault', 'tab', switchToInFileModal)
    eventBus.on('vault', 'arrow-up', () => moveIndex(-1))
    eventBus.on('vault', 'arrow-down', () => moveIndex(1))
    eventBus.on('vault', 'prev-search-history', prevSearchHistory)
    eventBus.on('vault', 'next-search-history', nextSearchHistory)
    eventBus.on('vault', 'toggle-context', toggleContext)
  })

  onDestroy(() => {
    eventBus.disable('vault')
  })

  function prevSearchHistory() {
    if (++historySearchIndex >= searchHistory.length) {
      historySearchIndex = 0
    }
    searchQuery = searchHistory[historySearchIndex]
  }
  function nextSearchHistory() {
    if (--historySearchIndex < 0) {
      historySearchIndex = searchHistory.length ? searchHistory.length - 1 : 0
    }
    searchQuery = searchHistory[historySearchIndex]
  }

  function toggleContext() {
    settings.update(s => {
      s.showContext =
        s.showContext === SearchContextType.None
          ? SearchContextType.Simple
          : SearchContextType.None
      return s
    })
  }

  async function updateResults() {
    query = new Query(searchQuery)
    resultNotes = (await getSuggestions(query)).sort(
      (a, b) => b.score - a.score
    )
    selectedIndex = 0
    scrollIntoView()
  }

  function onClick(evt?: MouseEvent | KeyboardEvent) {
    if (!selectedNote) return
    openNote(selectedNote, evt?.ctrlKey) // Keep ctrl pressed to open in a new pane
    modal.close()
  }

  function openNoteAndCloseModal(): void {
    if (!selectedNote) return
    openSearchResult(selectedNote)
    modal.close()
  }

  function openNoteInNewPane(): void {
    if (!selectedNote) return
    openSearchResult(selectedNote, true)
    modal.close()
  }

  function openSearchResult(note: ResultNote, newPane = false) {
    searchHistory.unshift(searchQuery)
    saveSearchHistory()
    openNote(note, newPane)
  }

  async function createNoteAndCloseModal(opt?: {
    newLeaf: boolean
  }): Promise<void> {
    console.log(opt)
    try {
      await createNote(searchQuery, opt?.newLeaf)
    } catch (e) {
      new Notice((e as Error).message)
      return
    }
    modal.close()
  }

  function insertLink(): void {
    if (!selectedNote) return
    const file = app.vault
      .getMarkdownFiles()
      .find(f => f.path === selectedNote.path)
    const active = app.workspace.getActiveFile()
    const view = app.workspace.getActiveViewOfType(MarkdownView)
    if (!view?.editor) {
      new Notice('Omnisearch - Error - No active editor', 3000)
      return
    }

    // Generate link
    let link: string
    if (file && active) {
      link = app.fileManager.generateMarkdownLink(file, active.path)
    } else {
      link = `[[${selectedNote.basename}.md]]`
    }

    // Inject link
    const cursor = view.editor.getCursor()
    view.editor.replaceRange(link, cursor, cursor)
    cursor.ch += link.length
    view.editor.setCursor(cursor)

    modal.close()
  }

  function switchToInFileModal(): void {
    modal.close()
    if (selectedNote) {
      // Open in-file modal for selected search result
      const file = app.vault.getAbstractFileByPath(selectedNote.path)
      if (file && file instanceof TFile) {
        new OmnisearchInFileModal(app, file, searchQuery).open()
      }
    } else {
      // Open in-file modal for active file
      const view = app.workspace.getActiveViewOfType(MarkdownView)
      if (view) {
        new OmnisearchInFileModal(app, view.file, searchQuery).open()
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
      elem?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }
</script>

<div class="modal-title">Omnisearch - Vault</div>
<div class="modal-content">
  <InputSearch value={searchQuery} on:input={e => (searchQuery = e.detail)} />

  <ModalContainer>
    {#each resultNotes as result, i}
      <ResultItemVault
        selected={i === selectedIndex}
        note={result}
        on:mousemove={e => (selectedIndex = i)}
        on:click={onClick} />
    {/each}
    {#if !resultNotes.length && searchQuery}
      <center> We found 0 result for your search here. </center>
    {/if}
  </ModalContainer>
</div>

<div class="prompt-instructions">
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↑↓</span><span>to navigate</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">alt ↑↓</span><span
      >to cycle history</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↵</span><span>to open</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↹</span>
    <span>to switch to In-File Search</span>
  </div>

  <br />

  <div class="prompt-instruction">
    <span class="prompt-instruction-command">{getCtrlKeyLabel()} ↵</span>
    <span>to open in a new pane</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">shift ↵</span>
    <span>to create</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">ctrl shift ↵</span>
    <span>to create in a new pane</span>
  </div>

  <br />

  <div class="prompt-instruction">
    <span class="prompt-instruction-command">alt ↵</span>
    <span>to insert a link</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">ctrl+h</span><span
      >to toggle context</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">esc</span><span>to close</span>
  </div>
</div>
