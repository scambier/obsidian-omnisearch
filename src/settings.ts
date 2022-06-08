import { Plugin, PluginSettingTab, Setting, SliderComponent } from 'obsidian'
import type OmnisearchPlugin from './main'

interface WeightingSettings {
  weightBasename: number
  weightH1: number
  weightH2: number
  weightH3: number
}

export interface OmnisearchSettings extends WeightingSettings {
  respectExcluded: boolean
  reindexInRealTime: boolean
  ignoreDiacritics: boolean
  showIndexingNotices: boolean
  showShortName: boolean
  CtrlJK: boolean
  CtrlNP: boolean
  storeIndexInFile: boolean
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

    // Settings main title
    containerEl.createEl('h2', { text: 'Omnisearch settings' })

    // #region Behavior

    new Setting(containerEl).setName('Behavior').setHeading()

    // Index in real-time, desktop only
    if (require('electron')) {
      new Setting(containerEl)
        .setName('Reindex in real-time')
        .setDesc(
          "By default, notes a reindexed when Obsidian focus is lost. Enable this to reindex in real-time. May affect Obsidian's performances when editing large notes.",
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

    // Ignore diacritics
    // new Setting(containerEl)
    //   .setName('Ignore diacritics')
    //   .setDesc(
    //     'Normalize diacritics in search terms. Words like "brûlée" or "žluťoučký" will be indexed as "brulee" and "zlutoucky". Needs a restart to take effect.',
    //   )
    //   .addToggle(toggle =>
    //     toggle.setValue(settings.ignoreDiacritics).onChange(async v => {
    //       settings.ignoreDiacritics = v
    //       await saveSettings(this.plugin)
    //     }),
    //   )

    new Setting(containerEl)
      .setName('Store index in file')
      .setDesc(
        'EXPERIMENTAL - index is store on disk, instead of being rebuilt on every startup.',
      )
      .addToggle(toggle =>
        toggle.setValue(settings.storeIndexInFile).onChange(async v => {
          settings.storeIndexInFile = v
          await saveSettings(this.plugin)
        }),
      )

    // #endregion Behavior

    // #region User Interface

    new Setting(containerEl).setName('User Interface').setHeading()

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

    // Display note names without the full path
    new Setting(containerEl)
      .setName('Hide full path in results list')
      .setDesc(
        'In the search results, only show the note name, without the full path.',
      )
      .addToggle(toggle =>
        toggle.setValue(settings.showShortName).onChange(async v => {
          settings.showShortName = v
          await saveSettings(this.plugin)
        }),
      )

    // #endregion User Interface

    // #region Results Weighting

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

    // #endregion Results Weighting

    // #region Shortcuts

    new Setting(containerEl).setName('Shortcuts').setHeading()

    new Setting(containerEl)
      .setName(
        'Use [Ctrl/Cmd]+j/k to navigate up/down in the results, if Vim mode is enabled',
      )
      .addToggle(toggle =>
        toggle.setValue(settings.CtrlJK).onChange(async v => {
          settings.CtrlJK = v
          await saveSettings(this.plugin)
        }),
      )

    new Setting(containerEl)
      .setName(
        'Use [Ctrl/Cmd]+n/p to navigate up/down in the results, if Vim mode is enabled',
      )
      .addToggle(toggle =>
        toggle.setValue(settings.CtrlNP).onChange(async v => {
          settings.CtrlNP = v
          await saveSettings(this.plugin)
        }),
      )

    // #endregion Shortcuts
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
  respectExcluded: true,
  reindexInRealTime: false,
  ignoreDiacritics: true,

  showIndexingNotices: false,
  showShortName: false,

  weightBasename: 2,
  weightH1: 1.5,
  weightH2: 1.3,
  weightH3: 1.1,

  CtrlJK: false,
  CtrlNP: false,

  storeIndexInFile: false,
} as const

export let settings: OmnisearchSettings = Object.assign({}, DEFAULT_SETTINGS)

export async function loadSettings(plugin: Plugin): Promise<void> {
  settings = Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData())
}

export async function saveSettings(plugin: Plugin): Promise<void> {
  await plugin.saveData(settings)
}
