import { Plugin, PluginSettingTab, Setting, SliderComponent } from 'obsidian'
import type OmnisearchPlugin from './main'

interface WeightingSettings {
  weightBasename: number
  weightH1: number
  weightH2: number
  weightH3: number
}

export interface OmnisearchSettings extends WeightingSettings {
  showIndexingNotices: boolean
  respectExcluded: boolean
  reindexInRealTime: boolean
}

export class SettingsTab extends PluginSettingTab {
  plugin: OmnisearchPlugin

  constructor(plugin: OmnisearchPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    // Title
    containerEl.createEl('h2', { text: 'Omnisearch settings' })

    // Show notices
    new Setting(containerEl)
      .setName('Show indexing notices')
      .setDesc('Show a notice when indexing is done, usually at startup.')
      .addToggle(toggle =>
        toggle.setValue(settings.showIndexingNotices).onChange(async v => {
          settings.showIndexingNotices = v
          await saveSettings(this.plugin)
        }),
      )

    // Respect excluded files
    new Setting(containerEl)
      .setName('Respect Obsidian\'s "Excluded Files"')
      .setDesc(
        'Files that are in Obsidian\'s "Options > Files & Links > Excluded Files" list will be downranked in results.',
      )
      .addToggle(toggle =>
        toggle.setValue(settings.respectExcluded).onChange(async v => {
          settings.respectExcluded = v
          await saveSettings(this.plugin)
        }),
      )

    // Index in real-time, desktop only
    if (require('electron')) {
      new Setting(containerEl)
        .setName('Reindex in real-time')
        .setDesc(
          'By default, notes a reindexed when Obsidian focus is lost. Enable this to reindex in real-time. May affect performances.',
        )
        .addToggle(toggle =>
          toggle.setValue(settings.reindexInRealTime).onChange(async v => {
            settings.reindexInRealTime = v
            await saveSettings(this.plugin)
          }),
        )
    }
    else {
      // No real time indexing on mobile
      settings.reindexInRealTime = false
    }

    new Setting(containerEl).setName('Results weighting').setHeading()

    new Setting(containerEl)
      .setName(
        `File name & declared aliases (default: ${DEFAULT_SETTINGS.weightBasename})`,
      )
      .addSlider(cb => this.weightSlider(cb, 'weightBasename'))

    new Setting(containerEl)
      .setName(`Headings level 1 (default: ${DEFAULT_SETTINGS.weightH1})`)
      .addSlider(cb => this.weightSlider(cb, 'weightH1'))

    new Setting(containerEl)
      .setName(`Headings level 2 (default: ${DEFAULT_SETTINGS.weightH2})`)
      .addSlider(cb => this.weightSlider(cb, 'weightH2'))

    new Setting(containerEl)
      .setName(`Headings level 3 (default: ${DEFAULT_SETTINGS.weightH3})`)
      .addSlider(cb => this.weightSlider(cb, 'weightH3'))
  }

  weightSlider(cb: SliderComponent, key: keyof WeightingSettings): void {
    cb.setLimits(1, 3, 0.1)
    cb.setValue(settings[key])
    cb.setDynamicTooltip()
    cb.onChange(v => {
      settings[key] = v
      saveSettings(this.plugin)
    })
  }
}

export const DEFAULT_SETTINGS: OmnisearchSettings = {
  showIndexingNotices: false,
  respectExcluded: true,
  reindexInRealTime: false,
  weightBasename: 2,
  weightH1: 1.5,
  weightH2: 1.3,
  weightH3: 1.1,
} as const

export let settings: OmnisearchSettings = Object.assign({}, DEFAULT_SETTINGS)

export async function loadSettings(plugin: Plugin): Promise<void> {
  settings = Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData())
}

export async function saveSettings(plugin: Plugin): Promise<void> {
  await plugin.saveData(settings)
}
