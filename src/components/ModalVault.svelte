<script lang="ts">
  import { MarkdownView, Notice, Platform, TFile } from 'obsidian'
  import { onDestroy, onMount, tick } from 'svelte'
  import InputSearch from './InputSearch.svelte'
  import ModalContainer from './ModalContainer.svelte'
  import {
    eventBus,
    indexingStep,
    IndexingStepType,
    type ResultNote,
    SPACE_OR_PUNCTUATION,
    Action,
  } from 'src/globals'
  import { createNote, openNote } from 'src/tools/notes'
  import {
    getCtrlKeyLabel,
    getExtension,
    isFilePDF,
    loopIndex,
  } from 'src/tools/utils'
  import {
    OmnisearchInFileModal,
    type OmnisearchVaultModal,
  } from 'src/components/modals'
  import ResultItemVault from './ResultItemVault.svelte'
  import { Query } from 'src/search/query'
  import { cancelable, CancelablePromise } from 'cancelable-promise'
  import { debounce } from 'lodash-es'
  import type OmnisearchPlugin from '../main'

  export let modal: OmnisearchVaultModal
  export let previousQuery: string | undefined
  export let plugin: OmnisearchPlugin

  let selectedIndex = 0
  let historySearchIndex = 0
  let searchQuery: string | undefined
  let resultNotes: ResultNote[] = []
  let query: Query
  let indexingStepDesc = ''
  let searching = true
  let refInput: InputSearch | undefined
  let openInNewPaneKey: string
  let openInCurrentPaneKey: string
  let createInNewPaneKey: string
  let createInCurrentPaneKey: string
  let openInNewLeafKey: string = getCtrlKeyLabel() + ' alt ↵'

  $: selectedNote = resultNotes[selectedIndex]
  $: searchQuery = searchQuery ?? previousQuery
  $: if (plugin.settings.openInNewPane) {
    openInNewPaneKey = '↵'
    openInCurrentPaneKey = getCtrlKeyLabel() + ' ↵'
    createInNewPaneKey = 'shift ↵'
    createInCurrentPaneKey = getCtrlKeyLabel() + ' shift ↵'
  } else {
    openInNewPaneKey = getCtrlKeyLabel() + ' ↵'
    openInCurrentPaneKey = '↵'
    createInNewPaneKey = getCtrlKeyLabel() + ' shift ↵'
    createInCurrentPaneKey = 'shift ↵'
  }
  $: if (searchQuery) {
    updateResultsDebounced()
  } else {
    searching = false
    resultNotes = []
  }
  $: {
    switch ($indexingStep) {
      case IndexingStepType.LoadingCache:
        indexingStepDesc = 'Loading cache...'
        break
      case IndexingStepType.ReadingFiles:
        indexingStepDesc = 'Reading files...'
        break
      case IndexingStepType.IndexingFiles:
        indexingStepDesc = 'Indexing files...'
        break
      case IndexingStepType.WritingCache:
        updateResultsDebounced()
        indexingStepDesc = 'Updating cache...'
        break
      default:
        updateResultsDebounced()
        indexingStepDesc = ''
        break
    }
  }

  onMount(async () => {
    eventBus.enable('vault')
    eventBus.on('vault', Action.Enter, openNoteAndCloseModal)
    eventBus.on('vault', Action.OpenInBackground, openNoteInBackground)
    eventBus.on('vault', Action.CreateNote, createNoteAndCloseModal)
    eventBus.on('vault', Action.OpenInNewPane, openNoteInNewPane)
    eventBus.on('vault', Action.InsertLink, insertLink)
    eventBus.on('vault', Action.Tab, switchToInFileModal)
    eventBus.on('vault', Action.ArrowUp, () => moveIndex(-1))
    eventBus.on('vault', Action.ArrowDown, () => moveIndex(1))
    eventBus.on('vault', Action.PrevSearchHistory, prevSearchHistory)
    eventBus.on('vault', Action.NextSearchHistory, nextSearchHistory)
    eventBus.on('vault', Action.OpenInNewLeaf, openNoteInNewLeaf)
    await plugin.notesIndexer.refreshIndex()
    await updateResultsDebounced()
  })

  onDestroy(() => {
    eventBus.disable('vault')
  })

  async function prevSearchHistory() {
    // Filter out the empty string, if it's there
    const history = (await plugin.cacheManager.getSearchHistory()).filter(
      s => s
    )
    if (++historySearchIndex >= history.length) {
      historySearchIndex = 0
    }
    searchQuery = history[historySearchIndex]
    refInput?.setInputValue(searchQuery ?? '')
  }

  async function nextSearchHistory() {
    const history = (await plugin.cacheManager.getSearchHistory()).filter(
      s => s
    )
    if (--historySearchIndex < 0) {
      historySearchIndex = history.length ? history.length - 1 : 0
    }
    searchQuery = history[historySearchIndex]
    refInput?.setInputValue(searchQuery ?? '')
  }

  let cancelableQuery: CancelablePromise<ResultNote[]> | null = null
  async function updateResults() {
    searching = true
    // If search is already in progress, cancel it and start a new one
    if (cancelableQuery) {
      cancelableQuery.cancel()
      cancelableQuery = null
    }
    query = new Query(searchQuery, {
      ignoreDiacritics: plugin.settings.ignoreDiacritics,
      ignoreArabicDiacritics: plugin.settings.ignoreArabicDiacritics,
    })
    cancelableQuery = cancelable(
      new Promise(resolve => {
        resolve(plugin.searchEngine.getSuggestions(query))
      })
    )
    resultNotes = await cancelableQuery
    selectedIndex = 0
    await scrollIntoView()
    searching = false
  }

  // Debounce this function to avoid multiple calls caused by Svelte reactivity
  const updateResultsDebounced = debounce(updateResults, 0)

  function onClick(evt?: MouseEvent | KeyboardEvent) {
    if (!selectedNote) return
    if (evt?.ctrlKey) {
      openNoteInNewPane()
    } else {
      openNoteAndCloseModal()
    }
    modal.close()
  }

  function openNoteAndCloseModal(): void {
    if (!selectedNote) return
    openSearchResult(selectedNote)
    modal.close()
  }

  function openNoteInBackground(): void {
    if (!selectedNote) return
    openSearchResult(selectedNote, true)
  }

  function openNoteInNewPane(): void {
    if (!selectedNote) return
    openSearchResult(selectedNote, true)
    modal.close()
  }

  function openNoteInNewLeaf(): void {
    if (!selectedNote) return
    openSearchResult(selectedNote, true, true)
    modal.close()
  }

  function saveCurrentQuery() {
    if (searchQuery) {
      plugin.cacheManager.addToSearchHistory(searchQuery)
    }
  }

  function openSearchResult(
    note: ResultNote,
    newPane = false,
    newLeaf = false
  ) {
    saveCurrentQuery()
    const offset = note.matches?.[0]?.offset ?? 0
    openNote(plugin.app, note, offset, newPane, newLeaf)
  }

  async function onClickCreateNote(_e: MouseEvent) {
    await createNoteAndCloseModal()
  }

  async function createNoteAndCloseModal(opt?: {
    newLeaf: boolean
  }): Promise<void> {
    if (searchQuery) {
      try {
        await createNote(plugin.app, searchQuery, opt?.newLeaf)
      } catch (e) {
        new Notice((e as Error).message)
        return
      }
      modal.close()
    }
  }

  function insertLink(): void {
    if (!selectedNote) return
    const file = plugin.app.vault
      .getMarkdownFiles()
      .find(f => f.path === selectedNote.path)
    const active = plugin.app.workspace.getActiveFile()
    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
    if (!view?.editor) {
      new Notice('Omnisearch - Error - No active editor', 3000)
      return
    }

    // Generate link
    let link: string
    if (file && active) {
      link = plugin.app.fileManager.generateMarkdownLink(file, active.path)
    } else {
      link = `[[${selectedNote.basename}.${getExtension(selectedNote.path)}]]`
    }

    // Inject link
    const cursor = view.editor.getCursor()
    view.editor.replaceRange(link, cursor, cursor)
    cursor.ch += link.length
    view.editor.setCursor(cursor)

    modal.close()
  }

  function      switchToInFileModal(): void {
    // Do nothing if the selectedNote is a PDF,
    // or if there is 0 match (e.g indexing in progress)
    if (
      selectedNote &&
      (isFilePDF(selectedNote?.path) || !selectedNote?.matches.length)
    ) {
      return
    }

    saveCurrentQuery()
    modal.close()

    if (selectedNote) {
      // Open in-file modal for selected search result
      const file = plugin.app.vault.getAbstractFileByPath(selectedNote.path)
      if (file && file instanceof TFile) {
        new OmnisearchInFileModal(plugin, file, searchQuery).open()
      }
    } else {
      // Open in-file modal for active file
      const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
      if (view?.file) {
        new OmnisearchInFileModal(plugin, view.file, searchQuery).open()
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
      const elem = activeWindow.document.querySelector(
        `[data-result-id="${selectedNote.path}"]`
      )
      elem?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }
</script>

<InputSearch
  bind:this="{refInput}"
  plugin="{plugin}"
  initialValue="{searchQuery}"
  on:input="{e => (searchQuery = e.detail)}"
  placeholder="Omnisearch - Vault">
  <div class="omnisearch-input-container__buttons">
    {#if plugin.settings.showCreateButton}
      <button on:click="{onClickCreateNote}">Create note</button>
    {/if}
    {#if Platform.isMobile}
      <button on:click="{switchToInFileModal}">In-File search</button>
    {/if}
  </div>
</InputSearch>

{#if indexingStepDesc}
  <div style="text-align: center; color: var(--text-accent); margin-top: 10px">
    ⏳ Work in progress: {indexingStepDesc}
  </div>
{/if}

<ModalContainer>
  {#each resultNotes as result, i}
    <ResultItemVault
      {plugin}
      selected="{i === selectedIndex}"
      note="{result}"
      on:mousemove="{_ => (selectedIndex = i)}"
      on:click="{onClick}"
      on:auxclick="{evt => {
        if (evt.button == 1) openNoteInNewPane()
      }}" />
  {/each}
  <div style="text-align: center;">
    {#if !resultNotes.length && searchQuery && !searching}
      We found 0 result for your search here.
      {#if plugin.settings.simpleSearch && searchQuery
          .split(SPACE_OR_PUNCTUATION)
          .some(w => w.length < 3)}
        <br />
        <span style="color: var(--text-accent); font-size: small">
          You have enabled "Simpler Search" in the settings, try to type more
          characters.
        </span>
      {/if}
    {:else if searching}
      Searching...
    {/if}
  </div>
</ModalContainer>

<div class="prompt-instructions">
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">↑↓</span><span>to navigate</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">alt ↑↓</span>
    <span>to cycle history</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">{openInCurrentPaneKey}</span>
    <span>to open</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">tab</span>
    <span>to switch to In-File Search</span>
  </div>

  <div class="prompt-instruction">
    <span class="prompt-instruction-command">{openInNewPaneKey}</span>
    <span>to open in a new pane</span>
  </div>

  <div class="prompt-instruction">
    <span class="prompt-instruction-command">{openInNewLeafKey}</span>
    <span>to open in a new split</span>
  </div>

  <div class="prompt-instruction">
    <span class="prompt-instruction-command">alt o</span>
    <span>to open in the background</span>
  </div>

  <div class="prompt-instruction">
    <span class="prompt-instruction-command">{createInCurrentPaneKey}</span>
    <span>to create</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">{createInNewPaneKey}</span>
    <span>to create in a new pane</span>
  </div>

  <div class="prompt-instruction">
    <span class="prompt-instruction-command">alt ↵</span>
    <span>to insert a link</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">ctrl g</span>
    <span>to toggle excerpts</span>
  </div>
  <div class="prompt-instruction">
    <span class="prompt-instruction-command">esc</span><span>to close</span>
  </div>
</div>
