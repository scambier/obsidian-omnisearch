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
  import type OmnisearchPlugin from '../main'
  import { setIcon, TFile } from 'obsidian'
  import { onMount } from 'svelte'

  // Import icon utility functions
  import {
    loadIconData,
    initializeIconPacks,
    getIconNameForPath,
    loadIconSVG,
    getDefaultIconSVG,
  } from '../tools/icon-utils'

  export let selected = false
  export let note: ResultNote
  export let plugin: OmnisearchPlugin

  let imagePath: string | null = null
  let title = ''
  let notePath = ''
  let iconData = {}
  let folderIconSVG: string | null = null
  let fileIconSVG: string | null = null
  let prefixToIconPack: { [prefix: string]: string } = {}
  let iconsPath: string
  let iconDataLoaded = false // Flag to indicate iconData is loaded

  // Initialize icon data and icon packs once when the component mounts
  onMount(async () => {
    iconData = await loadIconData(plugin)
    const iconPacks = await initializeIconPacks(plugin)
    prefixToIconPack = iconPacks.prefixToIconPack
    iconsPath = iconPacks.iconsPath
    iconDataLoaded = true // Set the flag after iconData is loaded
  })

  // Reactive statement to call loadIcons() whenever the note changes and iconData is loaded
  $: if (note && note.path && iconDataLoaded) {
    ;(async () => {
      // Update title and notePath before loading icons
      title = note.displayTitle || note.basename
      notePath = pathWithoutFilename(note.path)
      await loadIcons()
    })()
  }

  async function loadIcons() {
    // Load folder icon
    const folderIconName = getIconNameForPath(notePath, iconData)
    if (folderIconName) {
      folderIconSVG = await loadIconSVG(
        folderIconName,
        plugin,
        iconsPath,
        prefixToIconPack
      )
    } else {
      // Fallback to default folder icon
      folderIconSVG = getDefaultIconSVG('folder', plugin)
    }

    // Load file icon
    const fileIconName = getIconNameForPath(note.path, iconData)
    if (fileIconName) {
      fileIconSVG = await loadIconSVG(
        fileIconName,
        plugin,
        iconsPath,
        prefixToIconPack
      )
    } else {
      // Fallback to default icons based on file type
      fileIconSVG = getDefaultIconSVG(note.path, plugin)
    }
  }

  // Svelte action to render SVG content with dynamic updates
  function renderSVG(node: HTMLElement, svgContent: string) {
    node.innerHTML = svgContent
    return {
      update(newSvgContent: string) {
        node.innerHTML = newSvgContent
      },
      destroy() {
        node.innerHTML = ''
      },
    }
  }
  let elFolderPathIcon: HTMLElement | null = null
  let elFilePathIcon: HTMLElement | null = null
  let elEmbedIcon: HTMLElement | null = null

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
          <span
            bind:this="{elEmbedIcon}"
            title="The document above is embedded in this note"></span>
        {:else}
          <!-- File Icon -->
          {#if fileIconSVG}
            <span class="omnisearch-result__icon" use:renderSVG="{fileIconSVG}"
            ></span>
          {/if}
        {/if}
        <span>
          {@html plugin.textProcessor.highlightText(title, matchesTitle)}
        </span>
        {#if !note.displayTitle}
          <span class="omnisearch-result__extension">
            .{getExtension(note.path)}
          </span>
        {/if}

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
        <!-- Folder Icon -->
        {#if folderIconSVG}
          <span class="omnisearch-result__icon" use:renderSVG="{folderIconSVG}"
          ></span>
        {/if}
        <span>
          {@html plugin.textProcessor.highlightText(notePath, matchesNotePath)}
        </span>
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
