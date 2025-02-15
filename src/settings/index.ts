// noinspection CssUnresolvedCustomProperty
import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
} from 'obsidian'
import { writable } from 'svelte/store'
import { K_DISABLE_OMNISEARCH, RecencyCutoff } from '../globals'
import type OmnisearchPlugin from '../main'
import { enableVerboseLogging } from '../tools/utils'
import { injectSettingsIndexing } from './settings-indexing'
import { type OmnisearchSettings, saveSettings } from './utils'
import { injectSettingsBehavior } from './settings-behavior'
import { injectSettingsUserInterface } from './settings-ui'
import { injectSettingsWeighting } from './settings-weighting'
import { injectSettingsHttp } from './settings-http'
import { injectSettingsDanger } from './settings-danger'

/**
 * A store to reactively toggle the `showExcerpt` setting on the fly
 */
export const showExcerpt = writable(false)

export class SettingsTab extends PluginSettingTab {
  plugin: OmnisearchPlugin

  constructor(plugin: OmnisearchPlugin) {
    super(plugin.app, plugin)
    this.plugin = plugin

    showExcerpt.subscribe(async v => {
      settings.showExcerpt = v
      await saveSettings(this.plugin)
    })
  }

  display(): void {
    const { containerEl } = this
    const database = this.plugin.database

    containerEl.empty()

    if (this.app.loadLocalStorage(K_DISABLE_OMNISEARCH) == '1') {
      const span = containerEl.createEl('span')
      span.innerHTML = `<strong style="color: var(--text-accent)">⚠️ OMNISEARCH IS DISABLED ⚠️</strong>`
    }

    // Settings main title
    containerEl.createEl('h1', { text: 'Omnisearch' })

    // Sponsor link - Thank you!
    const divSponsor = containerEl.createDiv()
    divSponsor.innerHTML = `
        <iframe sandbox="allow-top-navigation-by-user-activation" src="https://github.com/sponsors/scambier/button" title="Sponsor scambier" height="35" width="116" style="border: 0;"></iframe>
        <a href='https://ko-fi.com/B0B6LQ2C' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a> 
    `

    injectSettingsIndexing(this.plugin, settings, containerEl)
    injectSettingsBehavior(this.plugin, settings, containerEl)
    injectSettingsUserInterface(this.plugin, settings, containerEl)
    injectSettingsWeighting(this.plugin, settings, containerEl, this.display)
    injectSettingsHttp(this.plugin, settings, containerEl)
    injectSettingsDanger(this.plugin, settings, containerEl)

    //#region Debugging

    new Setting(containerEl).setName('Debugging').setHeading()

    new Setting(containerEl)
      .setName('Enable verbose logging')
      .setDesc(
        "Adds a LOT of logs for debugging purposes. Don't forget to disable it."
      )
      .addToggle(toggle =>
        toggle.setValue(settings.verboseLogging).onChange(async v => {
          settings.verboseLogging = v
          enableVerboseLogging(v)
          await saveSettings(this.plugin)
        })
      )

    //#endregion Debugging

    //#region Danger Zone

    //#endregion Danger Zone
  }
}

export function getDefaultSettings(app: App): OmnisearchSettings {
  return {
    useCache: true,
    hideExcluded: false,
    recencyBoost: RecencyCutoff.Disabled,
    downrankedFoldersFilters: [] as string[],
    ignoreDiacritics: true,
    ignoreArabicDiacritics: false,
    indexedFileTypes: [] as string[],
    displayTitle: '',
    PDFIndexing: false,
    officeIndexing: false,
    imagesIndexing: false,
    aiImageIndexing: false,
    unsupportedFilesIndexing: 'default',
    splitCamelCase: false,
    openInNewPane: false,
    vimLikeNavigationShortcut: app.vault.getConfig('vimMode') as boolean,

    ribbonIcon: true,
    showExcerpt: true,
    maxEmbeds: 5,
    renderLineReturnInExcerpts: true,
    showCreateButton: false,
    highlight: true,
    showPreviousQueryResults: true,
    simpleSearch: false,
    tokenizeUrls: false,
    fuzziness: '1',

    weightBasename: 10,
    weightDirectory: 7,
    weightH1: 6,
    weightH2: 5,
    weightH3: 4,
    weightUnmarkedTags: 2,
    weightCustomProperties: [] as { name: string; weight: number }[],

    httpApiEnabled: false,
    httpApiPort: '51361',
    httpApiNotice: true,

    welcomeMessage: '',
    verboseLogging: false,

    DANGER_httpHost: null,
    DANGER_forceSaveCache: false,
  }
}

export let settings: OmnisearchSettings

// /**
//  * @deprecated
//  */
// export function getSettings(): OmnisearchSettings {
//   if (!settings) {
//     settings = Object.assign({}, getDefaultSettings()) as OmnisearchSettings
//   }
//   return settings
// }

export async function loadSettings(
  plugin: Plugin
): Promise<OmnisearchSettings> {
  settings = Object.assign(
    {},
    getDefaultSettings(plugin.app),
    await plugin.loadData()
  )
  showExcerpt.set(settings.showExcerpt)
  enableVerboseLogging(settings.verboseLogging)
  return settings
}
