// noinspection CssUnresolvedCustomProperty
import {
  App,
  Notice,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  SliderComponent,
} from 'obsidian'
import { writable } from 'svelte/store'
import { K_DISABLE_OMNISEARCH } from './globals'
import type OmnisearchPlugin from './main'
import { enablePrintDebug } from './tools/utils'
import { debounce } from 'lodash-es'

interface WeightingSettings {
  weightBasename: number
  weightDirectory: number
  weightH1: number
  weightH2: number
  weightH3: number
  weightUnmarkedTags: number
}

export interface OmnisearchSettings extends WeightingSettings {
  weightCustomProperties: { name: string; weight: number }[]
  /** Enables caching to speed up indexing */
  useCache: boolean
  /** Respect the "excluded files" Obsidian setting by downranking results ignored files */
  hideExcluded: boolean
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

/**
 * A store to reactively toggle the `showExcerpt` setting on the fly
 */
export const showExcerpt = writable(false)

const needsARestart = `<strong style="color: var(--text-accent)">Needs a restart to fully take effect.</strong>`

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
    const textExtractor = this.plugin.getTextExtractor()

    const clearCacheDebounced = debounce(async () => {
      await database.clearCache()
    }, 1000)

    const aiImageAnalyzer = this.plugin.getAIImageAnalyzer()
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

    //#region Indexing

    const indexingDesc = new DocumentFragment()
    indexingDesc.createSpan({}, span => {
      span.innerHTML = `⚠️ <span style="color: var(--text-accent)">Changing indexing settings will clear the cache, and requires a restart of Obsidian.</span><br/><br/>`
      if (textExtractor) {
        span.innerHTML += `
        👍 You have installed <a href="https://github.com/scambier/obsidian-text-extractor">Text Extractor</a>, Omnisearch can use it to index PDFs and images contents.
            <br />Text extraction only works on desktop, but the cache can be synchronized with your mobile device.`
      } else {
        span.innerHTML += `⚠️ Omnisearch requires <a href="https://github.com/scambier/obsidian-text-extractor">Text Extractor</a> to index PDFs and images.`
      }

      if (aiImageAnalyzer) {
        span.innerHTML += `<br/>👍 You have installed <a href="https://github.com/Swaggeroo/obsidian-ai-image-analyzer">AI Image Analyzer</a>, Omnisearch can use it to index images contents with ai.`
      }else {
        span.innerHTML += `<br/>⚠️ Omnisearch requires <a href="https://github.com/Swaggeroo/obsidian-ai-image-analyzer">AI Image Analyzer</a> to index images with ai.`
      }
    })

    new Setting(containerEl)
      .setName('Indexing')
      .setHeading()
      .setDesc(
        htmlDescription(`⚠️ <span style="color: var(--text-accent)">Changing indexing settings will clear the cache, and requires a restart of Obsidian.</span><br/><br/>
        ${
          textExtractor
            ? `👍 You have installed <a href="https://github.com/scambier/obsidian-text-extractor">Text Extractor</a>, Omnisearch can use it to index PDFs and images contents.
            <br />Text extraction only works on desktop, but the cache can be synchronized with your mobile device.`
            : `⚠️ Omnisearch requires <a href="https://github.com/scambier/obsidian-text-extractor">Text Extractor</a> to index PDFs and images.`
        }`)
      )

    // PDF Indexing
    new Setting(containerEl)
      .setName(`PDFs content indexing ${textExtractor ? '' : '⚠️ Disabled'}`)
      .setDesc(
        htmlDescription(
          `Omnisearch will use Text Extractor to index the content of your PDFs.`
        )
      )
      .addToggle(toggle =>
        toggle.setValue(settings.PDFIndexing).onChange(async v => {
          await database.clearCache()
          settings.PDFIndexing = v
          await saveSettings(this.plugin)
        })
      )
      .setDisabled(!textExtractor)

    // Images Indexing
    new Setting(containerEl)
      .setName(`Images OCR indexing ${textExtractor ? '' : '⚠️ Disabled'}`)
      .setDesc(
        htmlDescription(
          `Omnisearch will use Text Extractor to OCR your images and index their content.`
        )
      )
      .addToggle(toggle =>
        toggle.setValue(settings.imagesIndexing).onChange(async v => {
          await database.clearCache()
          settings.imagesIndexing = v
          await saveSettings(this.plugin)
        })
      )
      .setDisabled(!textExtractor)

    // Office Documents Indexing
    const indexOfficesDesc = new DocumentFragment()
    indexOfficesDesc.createSpan({}, span => {
      span.innerHTML = `Omnisearch will use Text Extractor to index the content of your office documents (currently <pre style="display:inline">.docx</pre> and <pre style="display:inline">.xlsx</pre>).`
    })
    new Setting(containerEl)
      .setName(
        `Documents content indexing ${textExtractor ? '' : '⚠️ Disabled'}`
      )
      .setDesc(indexOfficesDesc)
      .addToggle(toggle =>
        toggle.setValue(settings.officeIndexing).onChange(async v => {
          await database.clearCache()
          settings.officeIndexing = v
          await saveSettings(this.plugin)
        })
      )
      .setDisabled(!textExtractor)

    // AI Images Indexing
    const aiIndexImagesDesc = new DocumentFragment()
    aiIndexImagesDesc.createSpan({}, span => {
      span.innerHTML = `Omnisearch will use AI Image Analyzer to index the content of your images with ai.`
    })
    new Setting(containerEl)
      .setName(`Images AI indexing ${aiImageAnalyzer ? '' : '⚠️ Disabled'}`)
      .setDesc(aiIndexImagesDesc)
      .addToggle(toggle =>
        toggle.setValue(settings.aiImageIndexing).onChange(async v => {
          await database.clearCache()
          settings.aiImageIndexing = v
          await saveSettings(this.plugin)
        })
      )
      .setDisabled(!aiImageAnalyzer)

    // Index filenames of unsupported files
    new Setting(containerEl)
      .setName('Index paths of unsupported files')
      .setDesc(
        htmlDescription(`
      Omnisearch can index file<strong>names</strong> of "unsupported" files, such as e.g. <pre style="display:inline">.mp4</pre>
      or non-extracted PDFs & images.<br/>
      "Obsidian setting" will respect the value of "Files & Links > Detect all file extensions".`)
      )
      .addDropdown(dropdown => {
        dropdown
          .addOptions({ yes: 'Yes', no: 'No', default: 'Obsidian setting' })
          .setValue(settings.unsupportedFilesIndexing)
          .onChange(async v => {
            await clearCacheDebounced()
            ;(settings.unsupportedFilesIndexing as any) = v
            await saveSettings(this.plugin)
          })
      })

    // Custom display title
    new Setting(containerEl)
      .setName('Set frontmatter property key as title')
      .setDesc(
        htmlDescription(`If you have a custom property in your notes that you want to use as the title in search results.<br>
          Leave empty to disable.`)
      )
      .addText(component => {
        component.setValue(settings.displayTitle).onChange(async v => {
          await clearCacheDebounced()
          settings.displayTitle = v
          await saveSettings(this.plugin)
        })
      })

    // Additional text files to index
    new Setting(containerEl)
      .setName('Additional TEXT files to index')
      .setDesc(
        htmlDescription(`In addition to standard <code>md</code> files, Omnisearch can also index other <strong style="color: var(--text-accent)">PLAINTEXT</strong> files.<br/>
      Add extensions separated by a space, without the dot. Example: "<code>txt org csv</code>".<br />
      ⚠️ <span style="color: var(--text-accent)">Using extensions of non-plaintext files (like .pptx) WILL cause crashes,
      because Omnisearch will try to index their content.</span>`)
      )
      .addText(component => {
        component
          .setValue(settings.indexedFileTypes.join(' '))
          .setPlaceholder('Example: txt org csv')
          .onChange(async v => {
            await database.clearCache()
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
        'Enable caching to speed up indexing time. In rare cases, the cache write may cause a crash in Obsidian. This option will disable itself if it happens.'
      )
      .addToggle(toggle =>
        toggle.setValue(settings.useCache).onChange(async v => {
          settings.useCache = v
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

    // Respect excluded files
    new Setting(containerEl)
      .setName('Respect Obsidian\'s "Excluded Files"')
      .setDesc(
        `By default, files that are in Obsidian\'s "Options > Files & Links > Excluded Files" list are downranked in results.
        Enable this option to completely hide them.`
      )
      .addToggle(toggle =>
        toggle.setValue(settings.hideExcluded).onChange(async v => {
          settings.hideExcluded = v
          await saveSettings(this.plugin)
        })
      )

    // Downranked files
    new Setting(containerEl)
      .setName('Folders to downrank in search results')
      .setDesc(
        `Folders to downrank in search results. Files in these folders will be downranked in results.  They will still be indexed for tags, unlike excluded files.  Folders should be comma delimited.`
      )
      .addText(component => {
        component
          .setValue(settings.downrankedFoldersFilters.join(','))
          .setPlaceholder('Example: src,p2/dir')
          .onChange(async v => {
            let folders = v.split(',')
            folders = folders.map(f => f.trim())
            settings.downrankedFoldersFilters = folders
            await saveSettings(this.plugin)
          })
      })

    // Split CamelCaseWords
    new Setting(containerEl)
      .setName('Split CamelCaseWords')
      .setDesc(
        htmlDescription(`Enable this if you want to be able to search for CamelCaseWords as separate words.<br/>        
        ⚠️ <span style="color: var(--text-accent)">Changing this setting will clear the cache.</span><br>
        ${needsARestart}`)
      )
      .addToggle(toggle =>
        toggle.setValue(settings.splitCamelCase).onChange(async v => {
          await database.clearCache()
          settings.splitCamelCase = v
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

    // Extract URLs
    // Crashes on iOS
    if (!Platform.isIosApp) {
      new Setting(containerEl)
        .setName('Tokenize URLs')
        .setDesc(
          `Enable this if you want to be able to search for URLs as separate words.
        This setting has a strong impact on indexing performance, and can crash Obsidian under certain conditions.`
        )
        .addToggle(toggle =>
          toggle.setValue(settings.tokenizeUrls).onChange(async v => {
            settings.tokenizeUrls = v
            await saveSettings(this.plugin)
          })
        )
    }

    // Open in new pane
    new Setting(containerEl)
      .setName('Open in new pane')
      .setDesc(
        'Open and create files in a new pane instead of the current pane.'
      )
      .addToggle(toggle =>
        toggle.setValue(settings.openInNewPane).onChange(async v => {
          settings.openInNewPane = v
          await saveSettings(this.plugin)
        })
      )

    // Set Vim like navigation keys
    new Setting(containerEl)
      .setName('Set Vim like navigation keys')
      .setDesc(
        'Navigate down the results with Ctrl/⌘ + J/N, or navigate up with Ctrl/⌘ + K/P'
      )
      .addToggle(toggle =>
        toggle
          .setValue(settings.vimLikeNavigationShortcut)
          .onChange(async v => {
            settings.vimLikeNavigationShortcut = v
            await saveSettings(this.plugin)
          })
      )

    // Fuzziness
    new Setting(containerEl)
      .setName('Fuzziness')
      .setDesc(
        "Define the level of fuzziness for the search. The higher the fuzziness, the more results you'll get."
      )
      .addDropdown(dropdown =>
        dropdown
          .addOptions({
            0: 'Exact match',
            1: 'Not too fuzzy',
            2: 'Fuzzy enough',
          })
          .setValue(settings.fuzziness)
          .onChange(async v => {
            if (!['0', '1', '2'].includes(v)) {
              v = '2'
            }
            settings.fuzziness = v as '0' | '1' | '2'
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

    // Show "Create note" button
    new Setting(containerEl)
      .setName('Show "Create note" button')
      .setDesc(
        htmlDescription(`Shows a button next to the search input, to create a note.
        Acts the same as the <code>shift ↵</code> shortcut, can be useful for mobile device users.`)
      )
      .addToggle(toggle =>
        toggle.setValue(settings.showCreateButton).onChange(async v => {
          settings.showCreateButton = v
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
        toggle.setValue(settings.highlight).onChange(async v => {
          settings.highlight = v
          await saveSettings(this.plugin)
        })
      )

    //#endregion User Interface

    //#region Results Weighting

    const defaultSettings = getDefaultSettings(this.app)

    new Setting(containerEl).setName('Results weighting').setHeading()

    new Setting(containerEl)
      .setName(
        `File name & declared aliases (default: ${defaultSettings.weightBasename})`
      )
      .addSlider(cb => this.weightSlider(cb, 'weightBasename'))

    new Setting(containerEl)
      .setName(`File directory (default: ${defaultSettings.weightDirectory})`)
      .addSlider(cb => this.weightSlider(cb, 'weightDirectory'))

    new Setting(containerEl)
      .setName(`Headings level 1 (default: ${defaultSettings.weightH1})`)
      .addSlider(cb => this.weightSlider(cb, 'weightH1'))

    new Setting(containerEl)
      .setName(`Headings level 2 (default: ${defaultSettings.weightH2})`)
      .addSlider(cb => this.weightSlider(cb, 'weightH2'))

    new Setting(containerEl)
      .setName(`Headings level 3 (default: ${defaultSettings.weightH3})`)
      .addSlider(cb => this.weightSlider(cb, 'weightH3'))

    new Setting(containerEl)
      .setName(`Tags (default: ${defaultSettings.weightUnmarkedTags})`)
      .addSlider(cb => this.weightSlider(cb, 'weightUnmarkedTags'))

    //#region Specific tags

    new Setting(containerEl)
      .setName('Header properties fields')
      .setDesc(
        'You can set custom weights for values of header properties (e.g. "keywords"). Weights under 1.0 will downrank the results.'
      )

    for (let i = 0; i < settings.weightCustomProperties.length; i++) {
      const item = settings.weightCustomProperties[i]
      new Setting(containerEl)
        .setName((i + 1).toString() + '.')
        // TODO: add autocompletion from app.metadataCache.getAllPropertyInfos()
        .addText(text => {
          text
            .setPlaceholder('Property name')
            .setValue(item.name)
            .onChange(async v => {
              item.name = v
              await saveSettings(this.plugin)
            })
        })
        .addSlider(cb => {
          cb.setLimits(0.1, 5, 0.1)
            .setValue(item.weight)
            .setDynamicTooltip()
            .onChange(async v => {
              item.weight = v
              await saveSettings(this.plugin)
            })
        })
        // Remove the tag
        .addButton(btn => {
          btn.setButtonText('Remove')
          btn.onClick(async () => {
            settings.weightCustomProperties.splice(i, 1)
            await saveSettings(this.plugin)
            this.display()
          })
        })
    }

    // Add a new custom tag
    new Setting(containerEl).addButton(btn => {
      btn.setButtonText('Add a new property')
      btn.onClick(_cb => {
        settings.weightCustomProperties.push({ name: '', weight: 1 })
        this.display()
      })
    })

    //#endregion Specific tags

    //#endregion Results Weighting

    //#region HTTP Server

    if (!Platform.isMobile) {
      new Setting(containerEl)
        .setName('API Access Through HTTP')
        .setHeading()
        .setDesc(
          htmlDescription(
            `Omnisearch can be used through a simple HTTP server (<a href="https://publish.obsidian.md/omnisearch/Public+API+%26+URL+Scheme#HTTP+Server">more information</a>).`
          )
        )

      new Setting(containerEl)
        .setName('Enable the HTTP server')
        .addToggle(toggle =>
          toggle.setValue(settings.httpApiEnabled).onChange(async v => {
            settings.httpApiEnabled = v
            if (v) {
              this.plugin.apiHttpServer.listen(settings.httpApiPort)
            } else {
              this.plugin.apiHttpServer.close()
            }
            await saveSettings(this.plugin)
          })
        )

      new Setting(containerEl).setName('HTTP Port').addText(component => {
        component
          .setValue(settings.httpApiPort)
          .setPlaceholder('51361')
          .onChange(async v => {
            if (parseInt(v) > 65535) {
              v = settings.httpApiPort
              component.setValue(settings.httpApiPort)
            }
            settings.httpApiPort = v
            if (settings.httpApiEnabled) {
              this.plugin.apiHttpServer.close()
              this.plugin.apiHttpServer.listen(settings.httpApiPort)
            }
            await saveSettings(this.plugin)
          })
      })

      new Setting(containerEl)
        .setName('Show a notification when the server starts')
        .setDesc(
          'Will display a notification if the server is enabled, at Obsidian startup.'
        )
        .addToggle(toggle =>
          toggle.setValue(settings.httpApiNotice).onChange(async v => {
            settings.httpApiNotice = v
            await saveSettings(this.plugin)
          })
        )
    }

    //#endregion HTTP Server

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
          enablePrintDebug(v)
          await saveSettings(this.plugin)
        })
      )

    //#endregion Debugging

    //#region Danger Zone
    new Setting(containerEl).setName('Danger Zone').setHeading()

    // Ignore diacritics
    new Setting(containerEl)
      .setName('Ignore diacritics')
      .setDesc(
        htmlDescription(`Normalize diacritics in search terms. Words like "brûlée" or "žluťoučký" will be indexed as "brulee" and "zlutoucky".<br/>
        ⚠️ <span style="color: var(--text-accent)">You probably should <strong>NOT</strong> disable this.</span><br>
        ⚠️ <span style="color: var(--text-accent)">Changing this setting will clear the cache.</span><br>
        ${needsARestart}`)
      )
      .addToggle(toggle =>
        toggle.setValue(settings.ignoreDiacritics).onChange(async v => {
          await database.clearCache()
          settings.ignoreDiacritics = v
          await saveSettings(this.plugin)
        })
      )

    new Setting(containerEl)
      .setName('Ignore Arabic diacritics (beta)')
      .addToggle(toggle =>
        toggle.setValue(settings.ignoreArabicDiacritics).onChange(async v => {
          await database.clearCache()
          settings.ignoreArabicDiacritics = v
          await saveSettings(this.plugin)
        })
      )

    // Disable Omnisearch
    const disableDesc = new DocumentFragment()
    disableDesc.createSpan({}, span => {
      span.innerHTML = `Disable Omnisearch on this device only.<br>
        ${needsARestart}`
    })
    new Setting(containerEl)
      .setName('Disable on this device')
      .setDesc(disableDesc)
      .addToggle(toggle =>
        toggle.setValue(isPluginDisabled(this.app)).onChange(async v => {
          if (v) {
            this.app.saveLocalStorage(K_DISABLE_OMNISEARCH, '1')
            new Notice('Omnisearch - Disabled. Please restart Obsidian.')
          } else {
            this.app.saveLocalStorage(K_DISABLE_OMNISEARCH) // No value = unset
            new Notice('Omnisearch - Enabled. Please restart Obsidian.')
          }
        })
      )

    // Force save cache
    new Setting(containerEl)
      .setName('Force save the cache')
      .setDesc(
        htmlDescription(`Omnisearch has a security feature that automatically disables cache writing if it cannot fully perform the operation.<br>
        Use this option to force the cache to be saved, even if it causes a crash.<br>
        ⚠️ <span style="color: var(--text-accent)">Enabling this setting could lead to crash loops</span>`)
      )
      .addToggle(toggle =>
        toggle.setValue(settings.DANGER_forceSaveCache).onChange(async v => {
          settings.DANGER_forceSaveCache = v
          await saveSettings(this.plugin)
        })
      )

    // Clear cache data
    if (isCacheEnabled()) {
      new Setting(containerEl)
        .setName('Clear cache data')
        .setDesc(
          htmlDescription(`Erase all Omnisearch cache data.
          Use this if Omnisearch results are inconsistent, missing, or appear outdated.<br>
          ${needsARestart}`)
        )
        .addButton(btn => {
          btn.setButtonText('Clear cache')
          btn.onClick(async () => {
            await database.clearCache()
          })
        })
    }

    //#endregion Danger Zone
  }

  weightSlider(cb: SliderComponent, key: keyof WeightingSettings): void {
    cb.setLimits(1, 5, 0.1)
      .setValue(settings[key])
      .setDynamicTooltip()
      .onChange(async v => {
        settings[key] = v
        await saveSettings(this.plugin)
      })
  }
}

export function getDefaultSettings(app: App): OmnisearchSettings {
  return {
    useCache: true,
    hideExcluded: false,
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
    renderLineReturnInExcerpts: true,
    showCreateButton: false,
    highlight: true,
    showPreviousQueryResults: true,
    simpleSearch: false,
    tokenizeUrls: false,
    fuzziness: '1',

    weightBasename: 3,
    weightDirectory: 2,
    weightH1: 1.5,
    weightH2: 1.3,
    weightH3: 1.1,
    weightUnmarkedTags: 1.1,
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

let settings: OmnisearchSettings

function htmlDescription(innerHTML: string): DocumentFragment {
  const desc = new DocumentFragment()
  desc.createSpan({}, span => {
    span.innerHTML = innerHTML
  })
  return desc
}

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
  enablePrintDebug(settings.verboseLogging)
  return settings
}

export async function saveSettings(plugin: Plugin): Promise<void> {
  await plugin.saveData(settings)
}

export function isPluginDisabled(app: App): boolean {
  return app.loadLocalStorage(K_DISABLE_OMNISEARCH) === '1'
}

export function isCacheEnabled(): boolean {
  return !Platform.isIosApp && settings.useCache
}
