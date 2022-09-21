import { Plugin, PluginSettingTab, Setting, SliderComponent } from 'obsidian'
import { notesCacheFilePath, searchIndexFilePath } from './globals'
import type OmnisearchPlugin from './main'
import { get, writable } from 'svelte/store'

interface WeightingSettings {
  weightBasename: number
  weightH1: number
  weightH2: number
  weightH3: number
}

export interface OmnisearchSettings extends WeightingSettings {
  respectExcluded: boolean
  ignoreDiacritics: boolean
  showIndexingNotices: boolean
  ribbonIcon: boolean
  showShortName: boolean
  showContext: boolean
  showCreateButton: boolean
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

    // Respect excluded files
    new Setting(containerEl)
      .setName('Respect Obsidian\'s "Excluded Files"')
      .setDesc(
        'Files that are in Obsidian\'s "Options > Files & Links > Excluded Files" list will be downranked in results.'
      )
      .addToggle(toggle =>
        toggle.setValue(get(settings).respectExcluded).onChange(async v => {
          settings.update(s => {
            s.respectExcluded = v
            return s
          })
          await saveSettings(this.plugin)
        })
      )

    // Ignore diacritics
    const diacriticsDesc = new DocumentFragment()
    diacriticsDesc.createSpan({}, span => {
      span.innerHTML = `Normalize diacritics in search terms. Words like "brûlée" or "žluťoučký" will be indexed as "brulee" and "zlutoucky".<br/>
        <strong>Needs a restart to fully take effect.</strong>`
    })
    new Setting(containerEl)
      .setName('Ignore diacritics')
      .setDesc(diacriticsDesc)
      .addToggle(toggle =>
        toggle.setValue(get(settings).ignoreDiacritics).onChange(async v => {
          settings.update(s => {
            s.ignoreDiacritics = v
            return s
          })
          await saveSettings(this.plugin)
        })
      )

    // Store index
    const serializedIndexDesc = new DocumentFragment()
    serializedIndexDesc.createSpan({}, span => {
      span.innerHTML = `The search index is stored on disk, instead of being rebuilt at every startup.
        This results in faster loading times for bigger vaults and mobile devices.<br />
        <em>⚠️ Note: the index can become corrupted - if you notice any issue, disable and re-enable this option to clear the cache.</em><br/>
        <em>⚠️ Cache files in <code>.obsidian/plugins/omnisearch/</code> must not be synchronized.</em><br/>
        <strong>Needs a restart to fully take effect.</strong>
        `
    })
    new Setting(containerEl)
      .setName('EXPERIMENTAL - Store index in file')
      .setDesc(serializedIndexDesc)
      .addToggle(toggle =>
        toggle.setValue(get(settings).storeIndexInFile).onChange(async v => {
          await app.vault.adapter.remove(notesCacheFilePath)
          await app.vault.adapter.remove(searchIndexFilePath)
          settings.update(s => {
            s.storeIndexInFile = v
            return s
          })
          await saveSettings(this.plugin)
        })
      )

    // #endregion Behavior

    // #region User Interface

    new Setting(containerEl).setName('User Interface').setHeading()

    // Show Ribbon Icon
    new Setting(containerEl)
      .setName('Show ribbon button')
      .setDesc(
        'Add a button on the sidebar to open the Vault search modal. Needs a restart to remove the button.'
      )
      .addToggle(toggle =>
        toggle.setValue(get(settings).ribbonIcon).onChange(async v => {
          settings.update(s => {
            s.ribbonIcon = v
            return s
          })
          await saveSettings(this.plugin)
          if (v) {
            this.plugin.addRibbonButton()
          }
        })
      )

    // Show Context
    new Setting(containerEl)
      .setName('Show context')
      .setDesc(
        'Shows the part of the note that matches the search. Disable this to only show filenames in results.'
      )
      .addToggle(toggle =>
        toggle.setValue(get(settings).showContext).onChange(async v => {
          settings.update(s => {
            s.showContext = v
            return s
          })
          await saveSettings(this.plugin)
          if (v) {
            this.plugin.addRibbonButton()
          }
        })
      )

    // Show "Create note" button
    const createBtnDesc = new DocumentFragment()
    createBtnDesc.createSpan({}, span => {
      span.innerHTML = `Shows a button next to the search input, to create a note.
        Acts the same as the <code>shift ↵</code> shortcut, can be useful for mobile device users.`
    })
    new Setting(containerEl)
      .setName('Show "Create note" button')
      .setDesc(createBtnDesc)
      .addToggle(toggle =>
        toggle.setValue(get(settings).showCreateButton).onChange(async v => {
          settings.update(s => {
            s.showCreateButton = v
            return s
          })
          await saveSettings(this.plugin)
        })
      )

    // Show notices
    new Setting(containerEl)
      .setName('Show indexing notices')
      .setDesc('Shows a notice when indexing is done, usually at startup.')
      .addToggle(toggle =>
        toggle.setValue(get(settings).showIndexingNotices).onChange(async v => {
          settings.update(s => {
            s.showIndexingNotices = v
            return s
          })
          await saveSettings(this.plugin)
        })
      )

    // Display note names without the full path
    new Setting(containerEl)
      .setName('Hide full path in results list')
      .setDesc(
        'In the search results, only show the note name, without the full path.'
      )
      .addToggle(toggle =>
        toggle.setValue(get(settings).showShortName).onChange(async v => {
          settings.update(s => {
            s.showShortName = v
            return s
          })
          await saveSettings(this.plugin)
        })
      )

    // #endregion User Interface

    // #region Results Weighting

    new Setting(containerEl).setName('Results weighting').setHeading()

    new Setting(containerEl)
      .setName(
        `File name & declared aliases (default: ${DEFAULT_SETTINGS.weightBasename})`
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
        'Use [Ctrl/Cmd]+j/k to navigate up/down in the results, if Vim mode is enabled'
      )
      .addToggle(toggle =>
        toggle.setValue(get(settings).CtrlJK).onChange(async v => {
          settings.update(s => {
            s.CtrlJK = v
            return s
          })
          await saveSettings(this.plugin)
        })
      )

    new Setting(containerEl)
      .setName(
        'Use [Ctrl/Cmd]+n/p to navigate up/down in the results, if Vim mode is enabled'
      )
      .addToggle(toggle =>
        toggle.setValue(get(settings).CtrlNP).onChange(async v => {
          settings.update(s => {
            s.CtrlNP = v
            return s
          })
          await saveSettings(this.plugin)
        })
      )

    // #endregion Shortcuts
  }

  weightSlider(cb: SliderComponent, key: keyof WeightingSettings): void {
    cb.setLimits(1, 3, 0.1)
    cb.setValue(get(settings)[key])
    cb.setDynamicTooltip()
    cb.onChange(v => {
      settings.update(s => {
        s[key] = v
        return s
      })
      saveSettings(this.plugin)
    })
  }
}

export const DEFAULT_SETTINGS: OmnisearchSettings = {
  respectExcluded: true,
  ignoreDiacritics: true,

  showIndexingNotices: false,
  showShortName: false,
  ribbonIcon: true,
  showContext: true,
  showCreateButton: false,

  weightBasename: 2,
  weightH1: 1.5,
  weightH2: 1.3,
  weightH3: 1.1,

  CtrlJK: false,
  CtrlNP: false,

  storeIndexInFile: false,
} as const

export const settings = writable(
  Object.assign({}, DEFAULT_SETTINGS) as OmnisearchSettings
)

export async function loadSettings(plugin: Plugin): Promise<void> {
  settings.set(Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData()))
}

export async function saveSettings(plugin: Plugin): Promise<void> {
  await plugin.saveData(get(settings))
}
