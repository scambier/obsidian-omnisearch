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
  import { TFile, getIcon } from 'obsidian'
  import type OmnisearchPlugin from '../main'
  import { onMount } from 'svelte'

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

  // Read and parse data.json
  onMount(async () => {
    const dataJsonPath = `${plugin.app.vault.configDir}/plugins/obsidian-icon-folder/data.json`
    try {
      const dataJsonContent = await plugin.app.vault.adapter.read(dataJsonPath)
      iconData = JSON.parse(dataJsonContent)
    } catch (e) {
      console.error('Failed to read data.json:', e)
      iconData = {}
    }

    await initializeIconPacks()
    await loadIcons()
  })

  async function initializeIconPacks() {
    // Access the obsidian-icon-folder plugin
    const iconFolderPlugin = (window as any).app.plugins.plugins['obsidian-icon-folder']
    if (!iconFolderPlugin) {
      console.error('obsidian-icon-folder plugin not found')
      return
    }
    // Get the icons path from the plugin's settings
    const iconFolderSettings = iconFolderPlugin.settings
    iconsPath = iconFolderSettings?.iconPacksPath || 'icons'
    const iconsDir = `${plugin.app.vault.configDir}/${iconsPath}`

    try {
      const iconPackDirs = await plugin.app.vault.adapter.list(iconsDir)
      if (iconPackDirs.folders && iconPackDirs.folders.length > 0) {
        for (const folderPath of iconPackDirs.folders) {
          const pathParts = folderPath.split('/')
          const iconPackName = pathParts[pathParts.length - 1]
          const prefix = createIconPackPrefix(iconPackName)
          prefixToIconPack[prefix] = iconPackName
        }
      }
    } catch (e) {
      console.error('Failed to list icon packs:', e)
    }

    // Add 'Li' prefix for Lucide icons
    prefixToIconPack['Li'] = 'lucide-icons' // We can assign a placeholder name
  }

  function createIconPackPrefix(iconPackName: string): string {
    if (iconPackName.includes('-')) {
      const splitted = iconPackName.split('-');
      let result = splitted[0].charAt(0).toUpperCase();
      for (let i = 1; i < splitted.length; i++) {
        result += splitted[i].charAt(0).toLowerCase();
      }
      return result;
    }
    return iconPackName.charAt(0).toUpperCase() + iconPackName.charAt(1).toLowerCase()
  }

  async function loadIcons() {
    // Load folder icon
    const folderIconName = getIconNameForPath(notePath)
    if (folderIconName) {
      folderIconSVG = await loadIconSVG(folderIconName)
    } else {
      // Fallback to default folder icon
      const folderIconEl = getIcon('folder')
      folderIconSVG = folderIconEl ? folderIconEl.outerHTML : ''
    }

    // Load file icon
    const fileIconName = getIconNameForPath(note.path)
    if (fileIconName) {
      fileIconSVG = await loadIconSVG(fileIconName)
    } else {
      // Fallback to default icons based on file type
      fileIconSVG = getDefaultIconSVG()
    }
  }

  function getIconNameForPath(path: string): string | null {
    const iconEntry = iconData[path]
    if (iconEntry) {
      if (typeof iconEntry === 'string') {
        return iconEntry
      } else if (typeof iconEntry === 'object' && iconEntry.iconName) {
        return iconEntry.iconName
      }
    }
    return null
  }

  function parseIconName(iconName: string): { prefix: string, name: string } {
    const prefixMatch = iconName.match(/^[A-Z][a-z]*/)
    if (prefixMatch) {
      const prefix = prefixMatch[0]
      const name = iconName.substring(prefix.length)
      return { prefix, name }
    } else {
      // No prefix, treat the entire iconName as the name
      return { prefix: '', name: iconName }
    }
  }

  async function loadIconSVG(iconName: string): Promise<string | null> {
    const parsed = parseIconName(iconName)
    const { prefix, name } = parsed

    if (!prefix) {
      // No prefix, assume it's an emoji or text
      return `<span class="icon-emoji">${name}</span>`
    }

    const iconPackName = prefixToIconPack[prefix]

    if (!iconPackName) {
      console.error(`No icon pack found for prefix: ${prefix}`)
      return null
    }

    if (iconPackName === 'lucide-icons') {
      // Load Lucide icon using Obsidian's API
      const iconEl = getIcon(name.toLowerCase())
      if (iconEl) {
        return iconEl.outerHTML
      } else {
        console.error(`Lucide icon not found: ${name}`)
        return null
      }
    } else {
      const iconPath = `${plugin.app.vault.configDir}/${iconsPath}/${iconPackName}/${name}.svg`
      try {
        const svgContent = await plugin.app.vault.adapter.read(iconPath)
        return svgContent
      } catch (e) {
        console.error(`Failed to load icon SVG for ${iconName}:`, e)
        return null
      }
    }
  }

  function getDefaultIconSVG(): string {
    // Return SVG content for default icons based on file type
    let iconName = 'file'
    if (isFileImage(note.path)) {
      iconName = 'image'
    } else if (isFilePDF(note.path)) {
      iconName = 'file-text'
    } else if (isFileCanvas(note.path) || isFileExcalidraw(note.path)) {
      iconName = 'layout-dashboard'
    }
    const iconEl = getIcon(iconName)
    return iconEl ? iconEl.outerHTML : ''
  }

  // Svelte action to render SVG content
  function renderSVG(node: HTMLElement, svgContent: string) {
    node.innerHTML = svgContent
    return {
      destroy() {
        node.innerHTML = ''
      }
    }
  }

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
  $: matchesNotePath = plugin.textProcessor.getMatches(notePath, note.foundWords)
  $: cleanedContent = plugin.textProcessor.makeExcerpt(note.content, note.matches[0]?.offset ?? -1)
  $: glyph = false // cacheManager.getLiveDocument(note.path)?.doesNotExist
  $: {
    title = note.displayTitle || note.basename
    notePath = pathWithoutFilename(note.path)
  }
</script>

<ResultItemContainer
  glyph="{glyph}"
  id="{note.path}"
  on:auxclick
  on:click
  on:mousemove
  selected="{selected}">
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
