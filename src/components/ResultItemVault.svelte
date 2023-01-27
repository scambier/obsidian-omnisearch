<script lang="ts">
  import { settings, showExcerpt } from 'src/settings'
  import type { ResultNote } from '../globals'
  import {
    highlighter,
    isFileImage,
    makeExcerpt,
    removeDiacritics,
    stringsToRegex,
  } from '../tools/utils'
  import ResultItemContainer from './ResultItemContainer.svelte'

  export let selected = false
  export let note: ResultNote

  let imagePath: string | null = null
  let title = ''

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
    title = settings.showShortName ? note.basename : note.path
    if (settings.ignoreDiacritics) {
      title = removeDiacritics(title)
    }
  }
</script>

<ResultItemContainer
  glyph="{glyph}"
  id="{note.path}"
  on:click
  on:mousemove
  selected="{selected}">
  <div style="display:flex">
    <div>
      <div>
        <span class="omnisearch-result__title">
          {@html title.replace(reg, highlighter)}
        </span>

        {#if note.matches.length > 0}
          <span class="omnisearch-result__counter">
            {note.matches.length}&nbsp;{note.matches.length > 1
              ? 'matches'
              : 'match'}
          </span>
        {/if}
      </div>

      {#if $showExcerpt}
        <div class="omnisearch-result__body">
          {@html cleanedContent.replace(reg, highlighter)}
        </div>
      {/if}
    </div>

    {#if imagePath}
      <img style="width: 100px" src="{imagePath}" alt="" />
    {/if}
  </div>
</ResultItemContainer>
