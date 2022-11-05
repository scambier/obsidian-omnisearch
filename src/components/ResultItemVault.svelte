<script lang="ts">
  import { cacheManager } from 'src/cache-manager'
  import { settings, showExcerpt } from 'src/settings'
  import type { ResultNote } from '../globals'
  import {
    highlighter,
    isFileImage,
    makeExcerpt,
    stringsToRegex,
  } from '../tools/utils'
  import ResultItemContainer from './ResultItemContainer.svelte'

  export let selected = false
  export let note: ResultNote

  let imagePath: string | null = null

  $: {
    imagePath = null
    if (isFileImage(note.path)) {
      console.log(note.path)
      // @ts-ignore
      const file = app.vault.getFiles().find(f => f.path === note.path)
      if (file) {
        imagePath = app.vault.getResourcePath(file)
      }
    }
  }
  $: reg = stringsToRegex(note.foundWords)
  $: cleanedContent = makeExcerpt(note.content, note.matches[0]?.offset ?? -1)
  $: glyph = cacheManager.getLiveDocument(note.path)?.doesNotExist
  $: title = settings.showShortName ? note.basename : note.path
</script>

<ResultItemContainer
  id="{note.path}"
  selected="{selected}"
  on:mousemove
  on:click
  glyph="{glyph}">
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
