<script lang="ts">
  import { settings, showExcerpt } from 'src/settings'
  import type { ResultNote } from '../globals'
  import {
    getExtension,
    highlighter,
    isFileCanvas,
    isFileImage,
    isFilePDF,
    isFilePlaintext,
    makeExcerpt,
    pathWithoutFilename,
    removeDiacritics,
    stringsToRegex,
  } from '../tools/utils'
  import ResultItemContainer from './ResultItemContainer.svelte'
  import { onMount } from 'svelte'
  import { setIcon } from 'obsidian'

  export let selected = false
  export let note: ResultNote

  let imagePath: string | null = null
  let title = ''
  let notePath = ''
  let elFolderPathIcon: HTMLElement
  let elFilePathIcon: HTMLElement

  $: {
    imagePath = null
    if (isFileImage(note.path)) {
      // @ts-ignore
      const file = app.vault.getFiles().find(f => f.path === note.path)
      if (file) {
        // @ts-ignore
        imagePath = app.vault.getResourcePath(file)
      }
    }
  }
  $: reg = stringsToRegex(note.foundWords)
  $: cleanedContent = makeExcerpt(note.content, note.matches[0]?.offset ?? -1)
  $: glyph = false //cacheManager.getLiveDocument(note.path)?.doesNotExist
  $: {
    title = note.basename
    notePath = pathWithoutFilename(note.path)
    if (settings.ignoreDiacritics) {
      title = removeDiacritics(title)
    }

    // Icons
    if (elFolderPathIcon) {
      setIcon(elFolderPathIcon, 'folder-open')
    }
    if (elFilePathIcon) {
      if (isFileImage(note.path)) setIcon(elFilePathIcon, 'image')
      else if (isFilePDF(note.path)) setIcon(elFilePathIcon, 'file-text')
      else if (isFileCanvas(note.path)) setIcon(elFilePathIcon, 'layout-dashboard')
      else setIcon(elFilePathIcon, 'file')
    }
  }
</script>

<ResultItemContainer
  glyph="{glyph}"
  id="{note.path}"
  on:click
  on:mousemove
  selected="{selected}">
  <div>
    <div class="omnisearch-result__title-container">
      <span class="omnisearch-result__title">
        <span bind:this="{elFilePathIcon}"></span>
        <span>{@html title.replace(reg, highlighter)}</span>
        <span class="omnisearch-result__extension"
          >.{getExtension(note.path)}</span>

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
        <span>{notePath}</span>
      </div>
    {/if}

    <div style="display: flex; flex-direction: row;">
      {#if $showExcerpt}
        <div class="omnisearch-result__body">
          {@html cleanedContent.replace(reg, highlighter)}
        </div>
      {/if}

      <!-- Image -->
      {#if imagePath}
        <div class="omnisearch-result__image-container">
          <img style="width: 100px" src="{imagePath}" alt="" />
        </div>
      {/if}
    </div>
  </div>
</ResultItemContainer>
