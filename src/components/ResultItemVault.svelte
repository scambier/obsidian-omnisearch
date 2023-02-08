<script lang="ts">
  import { settings, showExcerpt } from 'src/settings'
  import type { ResultNote } from '../globals'
  import {
    highlighter,
    isFileImage,
    isFilePDF,
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
  let folderPathIcon
  let filePathIcon

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
    if (folderPathIcon) {
      setIcon(folderPathIcon, 'folder-open')
    }
    if (filePathIcon) {
      if (isFileImage(note.path)) setIcon(filePathIcon, 'file-image')
      else if (isFilePDF(note.path)) setIcon(filePathIcon, 'file-line-chart')
      else setIcon(filePathIcon, 'file-text')
    }
  }
</script>

<ResultItemContainer
  glyph="{glyph}"
  id="{note.path}"
  on:click
  on:mousemove
  selected="{selected}">
  <div style="flex-grow: 1;">
    <div class="omnisearch-result__title-container">
      <span class="omnisearch-result__title">
        <!--        <span bind:this="{filePathIcon}"></span>-->
        <span>{@html title.replace(reg, highlighter)}</span>

        <!-- Counter -->
        <!--{#if note.matches.length > 0}-->
        <!--  <span class="omnisearch-result__counter">-->
        <!--    {note.matches.length}&nbsp;{note.matches.length > 1-->
        <!--      ? 'matches'-->
        <!--      : 'match'}-->
        <!--  </span>-->
        <!--{/if}-->
      </span>

      <!-- Folder path -->
      <div class="omnisearch-result__folder-path">
        <span bind:this="{folderPathIcon}"></span>
        <span>{notePath}</span>
      </div>
    </div>

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
