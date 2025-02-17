import { Platform, Setting } from 'obsidian'
import type { OmnisearchSettings } from './utils'
import { saveSettings } from './utils'
import { htmlDescription, needsARestart } from './utils'
import type OmnisearchPlugin from 'src/main'
import { getCtrlKeyLabel } from 'src/tools/utils'

export function injectSettingsBehavior(
  plugin: OmnisearchPlugin,
  settings: OmnisearchSettings,
  containerEl: HTMLElement
) {
  const database = plugin.database

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
        await saveSettings(plugin)
      })
    )

  // Show previous query results
  new Setting(containerEl)
    .setName('Show previous query results')
    .setDesc('Re-executes the previous query when opening Omnisearch.')
    .addToggle(toggle =>
      toggle.setValue(settings.showPreviousQueryResults).onChange(async v => {
        settings.showPreviousQueryResults = v
        await saveSettings(plugin)
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
        await saveSettings(plugin)
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
          await saveSettings(plugin)
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
        await saveSettings(plugin)
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
        await saveSettings(plugin)
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
          await saveSettings(plugin)
        })
      )
  }

  // Open in new pane
  new Setting(containerEl)
    .setName('Open in new pane')
    .setDesc('Open and create files in a new pane instead of the current pane.')
    .addToggle(toggle =>
      toggle.setValue(settings.openInNewPane).onChange(async v => {
        settings.openInNewPane = v
        await saveSettings(plugin)
      })
    )

  // Set Vim like navigation keys
  new Setting(containerEl)
    .setName('Set Vim like navigation keys')
    .setDesc(
      `Navigate down the results with ${getCtrlKeyLabel()} + J/N, or navigate up with ${getCtrlKeyLabel()} + K/P.`
    )
    .addToggle(toggle =>
      toggle.setValue(settings.vimLikeNavigationShortcut).onChange(async v => {
        settings.vimLikeNavigationShortcut = v
        await saveSettings(plugin)
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
          await saveSettings(plugin)
        })
    )
}
