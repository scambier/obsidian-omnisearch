import {
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  SliderComponent,
} from 'obsidian'
import { writable } from 'svelte/store'
import { database } from './database'
import { getTextExtractor, isCacheEnabled } from './globals'
import type OmnisearchPlugin from './main'

interface WeightingSettings {
  weightBasename: number
  weightH1: number
  weightH2: number
  weightH3: number
}

export interface OmnisearchSettings extends WeightingSettings {
  /** Enables caching to speed up indexing */
  useCache: boolean
  /** Respect the "excluded files" Obsidian setting by downranking results ignored files */
  hideExcluded: boolean
  /** Ignore diacritics when indexing files */
  ignoreDiacritics: boolean
  /** Extensions of plain text files to index, in addition to .md */
  indexedFileTypes: string[]
  /** Enable PDF indexing */
  PDFIndexing: boolean
  /** Enable PDF indexing */
  imagesIndexing: boolean
  /** Activate the small 🔍 button on Obsidian's ribbon */
  ribbonIcon: boolean
  /** Display short filenames in search results, instead of the full path */
  showShortName: boolean
  /** Display the small contextual excerpt in search results */
  showExcerpt: boolean
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
  hightlight: boolean
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
    containerEl.createEl('h2', { text: 'Omnisearch' })

    // Sponsor link - Thank you!
    const divSponsor = containerEl.createDiv()
    divSponsor.innerHTML = `
        <iframe src="https://github.com/sponsors/scambier/button" title="Sponsor scambier" height="35" width="116" style="border: 0;"></iframe>
        <a href='https://ko-fi.com/B0B6LQ2C' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a> 
    `

    //#region Indexing

    new Setting(containerEl).setName('Indexing').setHeading()

    const textExtractDesc = new DocumentFragment()
    if (getTextExtractor()) {
      textExtractDesc.createSpan({}, span => {
        span.innerHTML = `👍 You have installed <a href="https://github.com/scambier/obsidian-text-extractor">Text Extractor</a>, Omnisearch will use it to index PDFs and images.
            <br />Text extraction only works on desktop, but the cache can be synchronized with your mobile device.`
      })
    } else {
      textExtractDesc.createSpan({}, span => {
        span.innerHTML = `⚠️ Omnisearch requires <a href="https://github.com/scambier/obsidian-text-extractor">Text Extractor</a> to index PDFs and images.`
      })
    }
    new Setting(containerEl).setDesc(textExtractDesc)

    // PDF Indexing
    const indexPDFsDesc = new DocumentFragment()
    indexPDFsDesc.createSpan({}, span => {
      span.innerHTML = `Include PDFs in search results`
    })
    new Setting(containerEl)
      .setName(`PDFs Indexing ${getTextExtractor() ? '' : '⚠️ Disabled'}`)
      .setDesc(indexPDFsDesc)
      .addToggle(toggle =>
        toggle.setValue(settings.PDFIndexing).onChange(async v => {
          settings.PDFIndexing = v
          await saveSettings(this.plugin)
        })
      )
      .setDisabled(!getTextExtractor())

    // Images Indexing
    const indexImagesDesc = new DocumentFragment()
    indexImagesDesc.createSpan({}, span => {
      span.innerHTML = `Include images in search results`
    })
    new Setting(containerEl)
      .setName(`Images Indexing ${getTextExtractor() ? '' : '⚠️ Disabled'}`)
      .setDesc(indexImagesDesc)
      .addToggle(toggle =>
        toggle.setValue(settings.imagesIndexing).onChange(async v => {
          settings.imagesIndexing = v
          await saveSettings(this.plugin)
        })
      )
      .setDisabled(!getTextExtractor())

    // Additional files to index
    const indexedFileTypesDesc = new DocumentFragment()
    indexedFileTypesDesc.createSpan({}, span => {
      span.innerHTML = `In addition to standard <code>md</code> files, Omnisearch can also index other <strong style="color: var(--text-accent)">plaintext</strong> files.<br/>
      Add extensions separated by a space, without the dot. Example: "<code>txt org</code>".<br />
      ⚠️ <span style="color: var(--text-accent)">Using extensions of non-plaintext files (like .docx or .pptx) WILL cause crashes,
      because Omnisearch will try to index their content.</span><br />
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

    //#endregion Indexing

    //#region Behavior

    new Setting(containerEl).setName('Behavior').setHeading()

    // Caching
    new Setting(containerEl)
      .setName('Save index to cache')
      .setDesc(
        'Enable caching to speed up indexing time. In rare cases, the cache write may cause a freeze in Obsidian. This option will disable itself if it happens.'
      )
      .addToggle(toggle =>
        toggle.setValue(settings.useCache).onChange(async v => {
          settings.useCache = v
          await saveSettings(this.plugin)
        })
      )

    // Respect excluded files
    new Setting(containerEl)
      .setName('Respect Obsidian\'s "Excluded Files"')
      .setDesc(
        `By default, files that are in Obsidian\'s "Options > Files & Links > Excluded Files" list are downranked in results.
        Enable this option to completely hide them`
      )
      .addToggle(toggle =>
        toggle.setValue(settings.hideExcluded).onChange(async v => {
          settings.hideExcluded = v
          await saveSettings(this.plugin)
        })
      )

    // Ignore diacritics
    const diacriticsDesc = new DocumentFragment()
    diacriticsDesc.createSpan({}, span => {
      span.innerHTML = `Normalize diacritics in search terms. Words like "brûlée" or "žluťoučký" will be indexed as "brulee" and "zlutoucky".<br/>
        ⚠️ <span style="color: var(--text-accent)">You probably should <strong>NOT</strong> disable this.</span><br>
        ⚠️ <span style="color: var(--text-accent)">Changing this setting will clear the cache.</span><br>
        <strong style="color: var(--text-accent)">Needs a restart to fully take effect.</strong>
        `
    })
    new Setting(containerEl)
      .setName('Ignore diacritics')
      .setDesc(diacriticsDesc)
      .addToggle(toggle =>
        toggle.setValue(settings.ignoreDiacritics).onChange(async v => {
          await database.clearCache()
          settings.ignoreDiacritics = v
          await saveSettings(this.plugin)
        })
      )

    // Simpler search
    new Setting(containerEl)
      .setName('Simpler search')
      .setDesc(
        `Enable this if Obsidian often freezes while making searches.
        Words shorter than 3 characters won't be used as prefixes; this can reduce search delay but will return fewer results.`
      )
      .addToggle(toggle =>
        toggle.setValue(settings.simpleSearch).onChange(async v => {
          settings.simpleSearch = v
          await saveSettings(this.plugin)
        })
      )

    //#endregion Behavior

    //#region User Interface

    new Setting(containerEl).setName('User Interface').setHeading()

    // Show Ribbon Icon
    new Setting(containerEl)
      .setName('Show ribbon button')
      .setDesc('Add a button on the sidebar to open the Vault search modal.')
      .addToggle(toggle =>
        toggle.setValue(settings.ribbonIcon).onChange(async v => {
          settings.ribbonIcon = v
          await saveSettings(this.plugin)
          if (v) {
            this.plugin.addRibbonButton()
          } else {
            this.plugin.removeRibbonButton()
          }
        })
      )

    // Show context excerpt
    new Setting(containerEl)
      .setName('Show excerpts')
      .setDesc(
        'Shows the contextual part of the note that matches the search. Disable this to only show filenames in results.'
      )
      .addToggle(toggle =>
        toggle.setValue(settings.showExcerpt).onChange(async v => {
          showExcerpt.set(v)
        })
      )

    // Keep line returns in excerpts
    new Setting(containerEl)
      .setName('Render line return in excerpts')
      .setDesc(
        'Activate this option to render line returns in result excerpts.'
      )
      .addToggle(toggle =>
        toggle
          .setValue(settings.renderLineReturnInExcerpts)
          .onChange(async v => {
            settings.renderLineReturnInExcerpts = v
            await saveSettings(this.plugin)
          })
      )

    // Show previous query results
    new Setting(containerEl)
      .setName('Show previous query results')
      .setDesc('Re-executes the previous query when opening Omnisearch.')
      .addToggle(toggle =>
        toggle.setValue(settings.showPreviousQueryResults).onChange(async v => {
          settings.showPreviousQueryResults = v
          await saveSettings(this.plugin)
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

    // Highlight results
    new Setting(containerEl)
      .setName('Highlight matching words in results')
      .setDesc(
        'Will highlight matching results when enabled. See README for more customization options.'
      )
      .addToggle(toggle =>
        toggle.setValue(settings.hightlight).onChange(async v => {
          settings.hightlight = v
          await saveSettings(this.plugin)
        })
      )

    //#endregion User Interface

    //#region Results Weighting

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

    //#endregion Results Weighting

    //#region Danger Zone
    if (isCacheEnabled()) {
      new Setting(containerEl).setName('Danger Zone').setHeading()

      const resetCacheDesc = new DocumentFragment()
      resetCacheDesc.createSpan({}, span => {
        span.innerHTML = `Erase all Omnisearch cache data.
      Use this if Omnisearch results are inconsistent, missing, or appear outdated.<br>
      <strong style="color: var(--text-accent)">Needs a restart to fully take effect.</strong>`
      })
      new Setting(containerEl)
        .setName('Clear cache data')
        .setDesc(resetCacheDesc)
        .addButton(cb => {
          cb.setButtonText('Clear cache')
          cb.onClick(async () => {
            await database.clearCache()
            new Notice('Omnisearch - Cache cleared. Please restart Obsidian.')
          })
        })
    }
    //#endregion Danger Zone
  }

  weightSlider(cb: SliderComponent, key: keyof WeightingSettings): void {
    cb.setLimits(1, 5, 0.1)
      .setValue(settings[key])
      .setDynamicTooltip()
      .onChange(v => {
        settings[key] = v
        saveSettings(this.plugin)
      })
  }
}

export const DEFAULT_SETTINGS: OmnisearchSettings = {
  useCache: true,
  hideExcluded: false,
  ignoreDiacritics: true,
  indexedFileTypes: [] as string[],
  PDFIndexing: false,
  imagesIndexing: false,

  showShortName: false,
  ribbonIcon: true,
  showExcerpt: true,
  renderLineReturnInExcerpts: true,
  showCreateButton: false,
  hightlight: true,
  showPreviousQueryResults: true,
  simpleSearch: false,

  weightBasename: 2,
  weightH1: 1.5,
  weightH2: 1.3,
  weightH3: 1.1,

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
