import { TFile, getIcon, normalizePath } from 'obsidian'
import type OmnisearchPlugin from '../main'
import {
  isFileImage,
  isFilePDF,
  isFileCanvas,
  isFileExcalidraw,
  warnDebug,
} from './utils'

export interface IconPacks {
  prefixToIconPack: { [prefix: string]: string }
  iconsPath: string
}

export async function loadIconData(plugin: OmnisearchPlugin): Promise<any> {
  const app = plugin.app

  const dataJsonPath = `${app.vault.configDir}/plugins/obsidian-icon-folder/data.json`
  try {
    const dataJsonContent = await app.vault.adapter.read(dataJsonPath)
    const rawIconData = JSON.parse(dataJsonContent)
    // Normalize keys
    const iconData: any = {}
    for (const key in rawIconData) {
      const normalizedKey = normalizePath(key)
      iconData[normalizedKey] = rawIconData[key]
    }
    return iconData
  } catch (e) {
    warnDebug('Failed to read data.json:', e)
    return {}
  }
}

export async function initializeIconPacks(
  plugin: OmnisearchPlugin
): Promise<IconPacks> {
  // Add 'Li' prefix for Lucide icons
  const prefixToIconPack: { [prefix: string]: string } = { Li: 'lucide-icons' }
  let iconsPath = 'icons'

  const app = plugin.app

  // Access the obsidian-icon-folder plugin
  const iconFolderPlugin = (app as any).plugins.getPlugin(
    'obsidian-icon-folder'
  )

  if (iconFolderPlugin) {
    // Get the icons path from the plugin's settings
    const iconFolderSettings = iconFolderPlugin.settings
    iconsPath = iconFolderSettings?.iconPacksPath || 'icons'
    const iconsDir = `${app.vault.configDir}/${iconsPath}`

    try {
      const iconPackDirs = await app.vault.adapter.list(iconsDir)
      if (iconPackDirs.folders && iconPackDirs.folders.length > 0) {
        for (const folderPath of iconPackDirs.folders) {
          const pathParts = folderPath.split('/')
          const iconPackName = pathParts[pathParts.length - 1]
          const prefix = createIconPackPrefix(iconPackName)
          prefixToIconPack[prefix] = iconPackName
        }
      }
    } catch (e) {
      warnDebug('Failed to list icon packs:', e)
    }
  }

  return { prefixToIconPack, iconsPath }
}

function createIconPackPrefix(iconPackName: string): string {
  if (iconPackName.includes('-')) {
    const splitted = iconPackName.split('-')
    let result = splitted[0].charAt(0).toUpperCase()
    for (let i = 1; i < splitted.length; i++) {
      result += splitted[i].charAt(0).toLowerCase()
    }
    return result
  }
  return (
    iconPackName.charAt(0).toUpperCase() + iconPackName.charAt(1).toLowerCase()
  )
}

export function getIconNameForPath(path: string, iconData: any): string | null {
  const normalizedPath = normalizePath(path)
  const iconEntry = iconData[normalizedPath]
  if (iconEntry) {
    if (typeof iconEntry === 'string') {
      return iconEntry
    } else if (typeof iconEntry === 'object' && iconEntry.iconName) {
      return iconEntry.iconName
    }
  }
  return null
}

export function parseIconName(iconName: string): {
  prefix: string
  name: string
} {
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

export async function loadIconSVG(
  iconName: string,
  plugin: OmnisearchPlugin,
  iconsPath: string,
  prefixToIconPack: { [prefix: string]: string }
): Promise<string | null> {
  const parsed = parseIconName(iconName)
  const { prefix, name } = parsed

  if (!prefix) {
    // No prefix, assume it's an emoji or text
    return `<span class="icon-emoji">${name}</span>`
  }

  const iconPackName = prefixToIconPack[prefix]

  if (!iconPackName) {
    warnDebug(`No icon pack found for prefix: ${prefix}`)
    return null
  }

  if (iconPackName === 'lucide-icons') {
    // Convert CamelCase to dash-case for Lucide icons
    const dashedName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
    const iconEl = getIcon(dashedName)
    if (iconEl) {
      return iconEl.outerHTML
    } else {
      warnDebug(`Lucide icon not found: ${dashedName}`)
      return null
    }
  } else {
    if (!iconsPath) {
      warnDebug('Icons path is not set. Cannot load icon SVG.')
      return null
    }
    const iconPath = `${plugin.app.vault.configDir}/${iconsPath}/${iconPackName}/${name}.svg`
    try {
      const svgContent = await plugin.app.vault.adapter.read(iconPath)
      return svgContent
    } catch (e) {
      warnDebug(`Failed to load icon SVG for ${iconName} at ${iconPath}:`, e)
      return null
    }
  }
}

export function getDefaultIconSVG(
  notePath: string,
  plugin: OmnisearchPlugin
): string {
  // Return SVG content for default icons based on file type
  let iconName = 'file'
  if (isFileImage(notePath)) {
    iconName = 'image'
  } else if (isFilePDF(notePath)) {
    iconName = 'file-text'
  } else if (isFileCanvas(notePath) || isFileExcalidraw(notePath)) {
    iconName = 'layout-dashboard'
  }
  const iconEl = getIcon(iconName)
  return iconEl ? iconEl.outerHTML : ''
}
