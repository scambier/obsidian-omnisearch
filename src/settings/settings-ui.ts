import { Setting } from 'obsidian'
import type OmnisearchPlugin from 'src/main'
import { showExcerpt } from '.'
import type { OmnisearchSettings } from './utils'
import { saveSettings } from './utils'
import { htmlDescription } from './utils'

export function injectSettingsUserInterface(
  plugin: OmnisearchPlugin,
  settings: OmnisearchSettings,
  containerEl: HTMLElement
) {
  new Setting(containerEl).setName('User Interface').setHeading()

  // Show Ribbon Icon
  new Setting(containerEl)
    .setName('Show ribbon button')
    .setDesc('Add a button on the sidebar to open the Vault search modal.')
    .addToggle(toggle =>
      toggle.setValue(settings.ribbonIcon).onChange(async v => {
        settings.ribbonIcon = v
        await saveSettings(plugin)
        if (v) {
          plugin.addRibbonButton()
        } else {
          plugin.removeRibbonButton()
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

  // Show embeds
  new Setting(containerEl)
    .setName('Show embed references')
    .setDesc(
      htmlDescription(`Some results are <a href="https://help.obsidian.md/Linking+notes+and+files/Embed+files">embedded</a> in other notes.<br>
            This setting controls the maximum number of embeds to show in the search results. Set to 0 to disable.<br>
            Also works with Text Extractor for embedded images and documents.`)
    )
    .addSlider(cb => {
      cb.setLimits(0, 10, 1)
        .setValue(settings.maxEmbeds)
        .setDynamicTooltip()
        .onChange(async v => {
          settings.maxEmbeds = v
          await saveSettings(plugin)
        })
    })

  // Keep line returns in excerpts
  new Setting(containerEl)
    .setName('Render line return in excerpts')
    .setDesc('Activate this option to render line returns in result excerpts.')
    .addToggle(toggle =>
      toggle.setValue(settings.renderLineReturnInExcerpts).onChange(async v => {
        settings.renderLineReturnInExcerpts = v
        await saveSettings(plugin)
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
        await saveSettings(plugin)
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
        await saveSettings(plugin)
      })
    )
}
