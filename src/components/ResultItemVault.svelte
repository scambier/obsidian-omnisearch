<!-- src/components/ResultItemVault.svelte -->
<script lang="ts">
  import { showExcerpt } from '../settings';
  import type { ResultNote } from '../globals';
  import {
    getExtension,
    isFileImage,
    pathWithoutFilename,
  } from '../tools/utils';
  import ResultItemContainer from './ResultItemContainer.svelte';
  import type OmnisearchPlugin from '../main';
  import { TFile } from 'obsidian';
  import { onMount } from 'svelte';

  // Import icon utility functions
  import {
    loadIconData,
    initializeIconPacks,
    getIconNameForPath,
    loadIconSVG,
    getDefaultIconSVG,
  } from '../tools/iconUtils';

  export let selected = false;
  export let note: ResultNote;
  export let plugin: OmnisearchPlugin;

  let imagePath: string | null = null;
  let title = '';
  let notePath = '';
  let iconData = {};
  let folderIconSVG: string | null = null;
  let fileIconSVG: string | null = null;
  let prefixToIconPack: { [prefix: string]: string } = {};
  let iconsPath: string;
  let iconDataLoaded = false; // Flag to indicate iconData is loaded

  // Initialize icon data and icon packs once when the component mounts
  onMount(async () => {
    iconData = await loadIconData(plugin);
    const iconPacks = await initializeIconPacks(plugin);
    prefixToIconPack = iconPacks.prefixToIconPack;
    iconsPath = iconPacks.iconsPath;
    iconDataLoaded = true; // Set the flag after iconData is loaded
  });

  // Reactive statement to call loadIcons() whenever the note changes and iconData is loaded
  $: if (note && note.path && iconDataLoaded) {
    (async () => {
      // Update title and notePath before loading icons
      title = note.displayTitle || note.basename;
      notePath = pathWithoutFilename(note.path);
      await loadIcons();
    })();
  }

  async function loadIcons() {
    // Load folder icon
    const folderIconName = getIconNameForPath(notePath, iconData);
    if (folderIconName) {
      folderIconSVG = await loadIconSVG(folderIconName, plugin, iconsPath, prefixToIconPack);
    } else {
      // Fallback to default folder icon
      folderIconSVG = getDefaultIconSVG('folder', plugin);
    }

    // Load file icon
    const fileIconName = getIconNameForPath(note.path, iconData);
    if (fileIconName) {
      fileIconSVG = await loadIconSVG(fileIconName, plugin, iconsPath, prefixToIconPack);
    } else {
      // Fallback to default icons based on file type
      fileIconSVG = getDefaultIconSVG(note.path, plugin);
    }
  }

  // Svelte action to render SVG content with dynamic updates
  function renderSVG(node: HTMLElement, svgContent: string) {
    node.innerHTML = svgContent;
    return {
      update(newSvgContent: string) {
        node.innerHTML = newSvgContent;
      },
      destroy() {
        node.innerHTML = '';
      },
    };
  }

  $: {
    imagePath = null;
    if (isFileImage(note.path)) {
      const file = plugin.app.vault.getAbstractFileByPath(note.path);
      if (file instanceof TFile) {
        imagePath = plugin.app.vault.getResourcePath(file);
      }
    }
  }

  $: matchesTitle = plugin.textProcessor.getMatches(title, note.foundWords);
  $: matchesNotePath = plugin.textProcessor.getMatches(notePath, note.foundWords);
  $: cleanedContent = plugin.textProcessor.makeExcerpt(
    note.content,
    note.matches[0]?.offset ?? -1
  );
  $: glyph = false; // cacheManager.getLiveDocument(note.path)?.doesNotExist
</script>

<ResultItemContainer
  glyph="{glyph}"
  id="{note.path}"
  on:auxclick
  on:click
  on:mousemove
  selected="{selected}"
>
  <div>
    <div class="omnisearch-result__title-container">
      <span class="omnisearch-result__title">
        <!-- File Icon -->
        {#if fileIconSVG}
          <span class="icon" use:renderSVG="{fileIconSVG}"></span>
        {/if}
        <span>{@html plugin.textProcessor.highlightText(title, matchesTitle)}</span>
        <span class="omnisearch-result__extension">
          .{getExtension(note.path)}
        </span>

        <!-- Counter -->
        {#if note.matches.length > 0}
          <span class="omnisearch-result__counter">
            {note.matches.length}&nbsp;{note.matches.length > 1 ? 'matches' : 'match'}
          </span>
        {/if}
      </span>
    </div>

    <!-- Folder path -->
    {#if notePath}
      <div class="omnisearch-result__folder-path">
        <!-- Folder Icon -->
        {#if folderIconSVG}
          <span class="icon" use:renderSVG="{folderIconSVG}"></span>
        {/if}
        <span>{@html plugin.textProcessor.highlightText(notePath, matchesNotePath)}</span>
      </div>
    {/if}

    <div style="display: flex; flex-direction: row;">
      {#if $showExcerpt}
        <div class="omnisearch-result__body">
          {@html plugin.textProcessor.highlightText(cleanedContent, note.matches)}
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

<style>
  .icon {
    display: inline-block;
    vertical-align: middle;
    width: 16px;
    height: 16px;
    margin-right: 4px;
  }
  .icon svg {
    width: 100%;
    height: 100%;
  }
  .icon-emoji {
    font-size: 16px;
    vertical-align: middle;
    margin-right: 4px;
  }
</style>
