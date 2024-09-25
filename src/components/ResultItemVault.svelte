<script lang="ts">
  import { showExcerpt } from '../settings'
  import type { ResultNote } from '../globals'
  import {
    getExtension,
    isFileCanvas,
    isFileExcalidraw,
    isFileImage,
    isFilePDF,
    pathWithoutFilename,
  } from '../tools/utils'
  import ResultItemContainer from './ResultItemContainer.svelte'
  import { TFile, setIcon } from 'obsidian'
  import type OmnisearchPlugin from '../main'
  import { SvelteComponent } from 'svelte'

  export let selected = false
  export let note: ResultNote
  export let plugin: OmnisearchPlugin

  let imagePath: string | null = null
  let title = ''
  let notePath = ''
  let elFolderPathIcon: HTMLElement
  let elFilePathIcon: HTMLElement
  let elEmbedIcon: HTMLElement

  $: {
    imagePath = null
    if (isFileImage(note.path)) {
      const file = plugin.app.vault.getAbstractFileByPath(note.path)
      if (file instanceof TFile) {
        imagePath = plugin.app.vault.getResourcePath(file)
      }
    }
  }
  $: matchesTitle = plugin.textProcessor.getMatches(title, note.foundWords)
  $: matchesNotePath = plugin.textProcessor.getMatches(
    notePath,
    note.foundWords
  )
  $: cleanedContent = plugin.textProcessor.makeExcerpt(
    note.content,
    note.matches[0]?.offset ?? -1
  )
  $: glyph = false //cacheManager.getLiveDocument(note.path)?.doesNotExist
  $: {
    title = note.displayTitle || note.basename
    notePath = pathWithoutFilename(note.path)

    // Icons
    if (elFolderPathIcon) {
      setIcon(elFolderPathIcon, 'folder-open')
    }
    if (elFilePathIcon) {
      if (isFileImage(note.path)) {
        setIcon(elFilePathIcon, 'image')
      } else if (isFilePDF(note.path)) {
        setIcon(elFilePathIcon, 'file-text')
      } else if (isFileCanvas(note.path) || isFileExcalidraw(note.path)) {
        setIcon(elFilePathIcon, 'layout-dashboard')
      } else {
        setIcon(elFilePathIcon, 'file')
      }
    }
    if (elEmbedIcon) {
      setIcon(elEmbedIcon, 'corner-down-right')
    }
  }
</script>

<ResultItemContainer
  glyph="{glyph}"
  id="{note.path}"
  cssClass=" {note.isEmbed ? 'omnisearch-result__embed' : ''}"
  on:auxclick
  on:click
  on:mousemove
  selected="{selected}">
  <div>
    <div class="omnisearch-result__title-container">
      <span class="omnisearch-result__title">
        {#if note.isEmbed}
          <span bind:this="{elEmbedIcon}" title="The document above is embedded in this note"></span>
        {:else}
          <span bind:this="{elFilePathIcon}"></span>
        {/if}
        <span>
          {@html plugin.textProcessor.highlightText(title, matchesTitle)}
        </span>
        <span class="omnisearch-result__extension">
          .{getExtension(note.path)}
        </span>

        <!-- Counter -->
        {#if note.matches.length > 0}
          <span class="omnisearch-result__counter">
            {note.matches.length}&nbsp;{note.matches.length > 1
              ? 'matches'
              : 'match'}
          </span>
        {/if}
      </span>
    </div>

    <!-- Folder path -->
    {#if notePath}
      <div class="omnisearch-result__folder-path">
        <span bind:this="{elFolderPathIcon}"></span>
        <span>
          {@html plugin.textProcessor.highlightText(
            notePath,
            matchesNotePath
          )}</span>
      </div>
    {/if}

    <!-- Do not display the excerpt for embedding references -->
    {#if !note.isEmbed}
      <div style="display: flex; flex-direction: row;">
        {#if $showExcerpt}
          <div class="omnisearch-result__body">
            {@html plugin.textProcessor.highlightText(
              cleanedContent,
              note.matches
            )}
          </div>
        {/if}

        <!-- Image -->
        {#if imagePath}
          <div class="omnisearch-result__image-container">
            <img style="width: 100px" src="{imagePath}" alt="" />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</ResultItemContainer>
