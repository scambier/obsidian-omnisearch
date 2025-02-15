import { App, Platform, Plugin } from 'obsidian'
import { K_DISABLE_OMNISEARCH, RecencyCutoff } from 'src/globals'
import { settings } from '.'

export function htmlDescription(innerHTML: string): DocumentFragment {
  const desc = new DocumentFragment()
  desc.createSpan({}, span => {
    span.innerHTML = innerHTML
  })
  return desc
}

export const needsARestart = `<strong style="color: var(--text-accent)">Needs a restart to fully take effect.</strong>`

export interface WeightingSettings {
  weightBasename: number
  weightDirectory: number
  weightH1: number
  weightH2: number
  weightH3: number
  weightUnmarkedTags: number
}
export function isPluginDisabled(app: App): boolean {
  return app.loadLocalStorage(K_DISABLE_OMNISEARCH) === '1'
}

export async function saveSettings(plugin: Plugin): Promise<void> {
  await plugin.saveData(settings)
}

export function isCacheEnabled(): boolean {
  return !Platform.isIosApp && settings.useCache
}
export interface OmnisearchSettings extends WeightingSettings {
  weightCustomProperties: { name: string; weight: number }[]
  /** Enables caching to speed up indexing */
  useCache: boolean
  /** Respect the "excluded files" Obsidian setting by downranking results ignored files */
  hideExcluded: boolean
  /** Boost more recent files */
  recencyBoost: RecencyCutoff
  /** downrank files in the given folders */
  downrankedFoldersFilters: string[]
  /** Ignore diacritics when indexing files */
  ignoreDiacritics: boolean
  ignoreArabicDiacritics: boolean

  /** Extensions of plain text files to index, in addition to .md */
  indexedFileTypes: string[]
  /** Custom title field */
  displayTitle: string
  /** Enable PDF indexing */
  PDFIndexing: boolean
  /** Enable Images indexing */
  imagesIndexing: boolean
  /** Enable Office documents indexing */
  officeIndexing: boolean
  /** Enable image ai indexing */
  aiImageIndexing: boolean

  /** Enable indexing of unknown files */
  unsupportedFilesIndexing: 'yes' | 'no' | 'default'
  /** Activate the small 🔍 button on Obsidian's ribbon */
  ribbonIcon: boolean
  /** Display the small contextual excerpt in search results */
  showExcerpt: boolean
  /** Number of embeds references to display in search results */
  maxEmbeds: number
  /** Render line returns with <br> in excerpts */
  renderLineReturnInExcerpts: boolean
  /** Enable a "create note" button in the Vault Search modal */
  showCreateButton: boolean
  /** Re-execute the last query when opening Omnisearch */
  showPreviousQueryResults: boolean
  /** Key for the welcome message when Obsidian is updated. A message is only shown once. */
  welcomeMessage: string
  /** If a query returns 0 result, try again with more relax conditions */
  simpleSearch: boolean
  tokenizeUrls: boolean
  highlight: boolean
  splitCamelCase: boolean
  openInNewPane: boolean
  verboseLogging: boolean
  vimLikeNavigationShortcut: boolean
  fuzziness: '0' | '1' | '2'
  httpApiEnabled: boolean
  httpApiPort: string
  httpApiNotice: boolean

  DANGER_httpHost: string | null
  DANGER_forceSaveCache: boolean
}
