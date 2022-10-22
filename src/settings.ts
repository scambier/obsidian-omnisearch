import {
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  SliderComponent,
} from 'obsidian'
import { writable } from 'svelte/store'
import type OmnisearchPlugin from './main'

interface WeightingSettings {
  weightBasename: number
  weightH1: number
  weightH2: number
  weightH3: number
}

export interface OmnisearchSettings extends WeightingSettings {
  /** Respect the "excluded files" Obsidian setting by downranking results ignored files */
  respectExcluded: boolean
  /** Ignore diacritics when indexing files */
  ignoreDiacritics: boolean
  /** Extensions of plain text files to index, in addition to .md */
  indexedFileTypes: string[]
  /** Enable PDF indexing */
  PDFIndexing: boolean
  /** Max number of spawned processes for background tasks, such as extracting text from PDFs */
  backgroundProcesses: number
  /** Write cache files on disk (unrelated to PDFs) */
  // persistCache: boolean
  /** Display Omnisearch popup notices over Obsidian */
  showIndexingNotices: boolean
  /** Activate the small 🔍 button on Obsidian's ribbon */
  ribbonIcon: boolean
  /** Display short filenames in search results, instead of the full path */
  showShortName: boolean
  /** Display the small contextual excerpt in search results */
  showExcerpt: boolean
  /** Enable a "create note" button in the Vault Search modal */
  showCreateButton: boolean
  /** Vim mode shortcuts */
  CtrlJK: boolean
  /** Vim mode shortcuts */
  CtrlNP: boolean
  /** Key for the welcome message when Obsidian is updated. A message is only shown once. */
  welcomeMessage: string
}

/**
 * A store to reactively toggle the `showExcerpt` setting on the fly
 */
export const showExcerpt = writable(false)

export class SettingsTab extends PluginSettingTab {
  plugin: OmnisearchPlugin

  constructor(plugin: OmnisearchPlugin) {
    super(app, plugin)
    this.plugin = plugin

    showExcerpt.subscribe(async v => {
      settings.showExcerpt = v
      await saveSettings(this.plugin)
    })
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
        toggle.setValue(settings.respectExcluded).onChange(async v => {
          settings.respectExcluded = v
          await saveSettings(this.plugin)
        })
      )

    // Ignore diacritics
    const diacriticsDesc = new DocumentFragment()
    diacriticsDesc.createSpan({}, span => {
      span.innerHTML = `Normalize diacritics in search terms. Words like "brûlée" or "žluťoučký" will be indexed as "brulee" and "zlutoucky".<br/>
        <strong style="color: var(--text-accent)">Needs a restart to fully take effect.</strong>`
    })
    new Setting(containerEl)
      .setName('Ignore diacritics')
      .setDesc(diacriticsDesc)
      .addToggle(toggle =>
        toggle.setValue(settings.ignoreDiacritics).onChange(async v => {
          settings.ignoreDiacritics = v
          await saveSettings(this.plugin)
        })
      )

    // Additional files to index
    const indexedFileTypesDesc = new DocumentFragment()
    indexedFileTypesDesc.createSpan({}, span => {
      span.innerHTML = `In addition to standard <code>md</code> files, Omnisearch can also index other plain text files.<br/>
      Add extensions separated by a space. Example: <code>txt org</code>.<br />
      <strong style="color: var(--text-accent)">Needs a restart to fully take effect.</strong>`
    })
    new Setting(containerEl)
      .setName('Additional files to index')
      .setDesc(indexedFileTypesDesc)
      .addText(component => {
        component
          .setValue(settings.indexedFileTypes.join(' '))
          .setPlaceholder('Example: txt org')
          .onChange(async v => {
            settings.indexedFileTypes = v.split(' ')
            await saveSettings(this.plugin)
          })
      })

    // // Background processes
    // new Setting(containerEl)
    //   .setName(
    //     `Background processes (default: ${DEFAULT_SETTINGS.backgroundProcesses})`
    //   )
    //   .setDesc('The maximum number of processes for background work, like PDF indexing. This value should not be higher than your number of CPU cores.')
    //   .addSlider(cb => {
    //     cb.setLimits(1, 16, 1)
    //       .setValue(settings.backgroundProcesses)
    //       .setDynamicTooltip()
    //       .onChange(v => {
    //         settings.backgroundProcesses = v
    //         saveSettings(this.plugin)
    //       })
    //   })

    // // Store index
    // const serializedIndexDesc = new DocumentFragment()
    // serializedIndexDesc.createSpan({}, span => {
    //   span.innerHTML = `This will speedup startup times after the initial indexing. Do not activate it unless indexing is too slow on your device:
    //     <ul>
    //       <li>PDF indexing is not affected by this setting</li>
    //       <li>⚠️ The index can become corrupted - if you notice any issue, disable and re-enable this option to clear the cache.</li>
    //       <li>⚠️ Cache files in <code>.obsidian/plugins/omnisearch/*.data</code> must not be synchronized between your devices.</li>
    //     </ul>
    //     <strong style="color: var(--text-accent)">Needs a restart to fully take effect.</strong>
    //     `
    // })
    // new Setting(containerEl)
    //   .setName('Persist cache on disk')
    //   .setDesc(serializedIndexDesc)
    //   .addToggle(toggle =>
    //     toggle.setValue(settings.persistCache).onChange(async v => {
    //       settings.persistCache = v
    //       await saveSettings(this.plugin)
    //     })
    //   )

    // PDF Indexing
    const indexPDFsDesc = new DocumentFragment()
    indexPDFsDesc.createSpan({}, span => {
      span.innerHTML = `Omnisearch will include PDFs in search results.
      <ul>
        <li>⚠️ Depending on their size, PDFs can take anywhere from a few seconds to 2 minutes to be processed.</li>
        <li>⚠️ Texts extracted from PDFs may contain errors such as missing spaces, or spaces in the middle of words.</li>
        <li>⚠️ Some PDFs can't be processed correctly and will return an empty text.</li>
        <li>This feature is currently a work-in-progress, please report issues that you might experience.</li>
      </ul>
       <strong style="color: var(--text-accent)">Needs a restart to fully take effect.</strong>`
    })
    new Setting(containerEl)
      .setName('BETA - PDF Indexing')
      .setDesc(indexPDFsDesc)
      .addToggle(toggle =>
        toggle.setValue(settings.PDFIndexing).onChange(async v => {
          settings.PDFIndexing = v
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
        toggle.setValue(settings.ribbonIcon).onChange(async v => {
          settings.ribbonIcon = v
          await saveSettings(this.plugin)
          if (v) {
            this.plugin.addRibbonButton()
          }
        })
      )

    // Show Context
    new Setting(containerEl)
      .setName('Show excerpt')
      .setDesc(
        'Shows the part of the note that matches the search. Disable this to only show filenames in results.'
      )
      .addToggle(toggle =>
        toggle.setValue(settings.showExcerpt).onChange(async v => {
          showExcerpt.set(v)
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
        toggle.setValue(settings.showCreateButton).onChange(async v => {
          settings.showCreateButton = v
          await saveSettings(this.plugin)
        })
      )

    // Show notices
    new Setting(containerEl)
      .setName('Show indexing notices')
      .setDesc('Shows a notice when indexing is done, usually at startup.')
      .addToggle(toggle =>
        toggle.setValue(settings.showIndexingNotices).onChange(async v => {
          settings.showIndexingNotices = v
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
        toggle.setValue(settings.showShortName).onChange(async v => {
          settings.showShortName = v
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
        toggle.setValue(settings.CtrlJK).onChange(async v => {
          settings.CtrlJK = v
          await saveSettings(this.plugin)
        })
      )

    new Setting(containerEl)
      .setName(
        'Use [Ctrl/Cmd]+n/p to navigate up/down in the results, if Vim mode is enabled'
      )
      .addToggle(toggle =>
        toggle.setValue(settings.CtrlNP).onChange(async v => {
          settings.CtrlNP = v
          await saveSettings(this.plugin)
        })
      )

    // #endregion Shortcuts
  }

  weightSlider(cb: SliderComponent, key: keyof WeightingSettings): void {
    cb.setLimits(1, 3, 0.1)
      .setValue(settings[key])
      .setDynamicTooltip()
      .onChange(v => {
        settings[key] = v
        saveSettings(this.plugin)
      })
  }
}

// Determining the maximum concurrent processes/workers/promises for heavy work,
// without hogging all the resources.
const cpuCount = Platform.isMobileApp ? 1 : require('os').cpus().length
let backgroundProcesses = Math.max(1, Math.floor(cpuCount * 0.75))
if (backgroundProcesses == cpuCount) {
  backgroundProcesses = 1
}

export const DEFAULT_SETTINGS: OmnisearchSettings = {
  respectExcluded: true,
  ignoreDiacritics: true,
  indexedFileTypes: [] as string[],
  PDFIndexing: false,
  backgroundProcesses,

  showIndexingNotices: false,
  showShortName: false,
  ribbonIcon: true,
  showExcerpt: true,
  showCreateButton: false,

  weightBasename: 2,
  weightH1: 1.5,
  weightH2: 1.3,
  weightH3: 1.1,

  CtrlJK: false,
  CtrlNP: false,

  // persistCache: false,

  welcomeMessage: '',
} as const

export let settings = Object.assign({}, DEFAULT_SETTINGS) as OmnisearchSettings

export async function loadSettings(plugin: Plugin): Promise<void> {
  settings = Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData())
  showExcerpt.set(settings.showExcerpt)
}

export async function saveSettings(plugin: Plugin): Promise<void> {
  await plugin.saveData(settings)
}
