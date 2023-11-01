<script lang="ts">
  import { settings, showExcerpt } from 'src/settings'
  import type { ResultNote } from '../globals'
  import {
    getExtension,
    isFileCanvas,
    isFileImage,
    isFilePDF,
    pathWithoutFilename,
    removeDiacritics,
  } from '../tools/utils'
  import ResultItemContainer from './ResultItemContainer.svelte'
  import { TFile, setIcon } from 'obsidian'
  import { cloneDeep } from 'lodash-es'
  import { stringsToRegex, getMatches, makeExcerpt, highlightText } from 'src/tools/text-processing'

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
      const file = app.vault.getAbstractFileByPath(note.path)
      if (file instanceof TFile) {
        imagePath = app.vault.getResourcePath(file)
      }
    }
  }
  $: reg = stringsToRegex(note.foundWords)
  $: matchesTitle = getMatches(title, reg)
  $: matchesExcerpt = cloneDeep(note.matches).map(m => {
    m.offset = m.offset - cleanedContent.offset
    return m
  })
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
      else if (isFileCanvas(note.path))
        setIcon(elFilePathIcon, 'layout-dashboard')
      else setIcon(elFilePathIcon, 'file')
    }
  }
</script>

<ResultItemContainer
  glyph="{glyph}"
  id="{note.path}"
  on:click
  on:auxclick
  on:mousemove
  selected="{selected}">
  <div>
    <div class="omnisearch-result__title-container">
      <span class="omnisearch-result__title">
        <span bind:this="{elFilePathIcon}"></span>
        <span>{@html highlightText(title, matchesTitle)}</span>
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
        <span>{notePath}</span>
      </div>
    {/if}

    <div style="display: flex; flex-direction: row;">
      {#if $showExcerpt}
        <div class="omnisearch-result__body">
          {@html highlightText(cleanedContent.content, matchesExcerpt)}
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
