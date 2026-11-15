import { t } from '../i18n'
import { Setting } from 'obsidian'
import { showExcerpt } from '.'
import type OmnisearchPlugin from '../main'
import type { OmnisearchSettings } from './utils'
import { htmlDescription, saveSettings } from './utils'

export function injectSettingsUserInterface(
  plugin: OmnisearchPlugin,
  settings: OmnisearchSettings,
  containerEl: HTMLElement
) {
  new Setting(containerEl).setName(t('User Interface')).setHeading()

  // Show Ribbon Icon
  new Setting(containerEl)
    .setName(t('Show ribbon button'))
    .setDesc(t('Add a button on the sidebar to open the Vault search modal.'))
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
    .setName(t('Show excerpts'))
    .setDesc(
      t(
        'Shows the contextual part of the note that matches the search. Disable this to only show filenames in results.'
      )
    )
    .addToggle(toggle =>
      toggle.setValue(settings.showExcerpt).onChange(async v => {
        showExcerpt.set(v)
      })
    )

  // Skip frontmatter in excerpts
  new Setting(containerEl)
    .setName(t('Prefer body matches in excerpts'))
    .setDesc(
      t(
        'When a note matches both in its properties (frontmatter) and in its body, center the excerpt on the first body match. Notes that only match in their properties still show the properties. Disable to always use the first match in the file.'
      )
    )
    .addToggle(toggle =>
      toggle.setValue(settings.excerptSkipFrontmatter).onChange(async v => {
        settings.excerptSkipFrontmatter = v
        await saveSettings(plugin)
      })
    )

  // Show embeds
  new Setting(containerEl)
    .setName(t('Show embed references'))
    .setDesc(
      htmlDescription(`${t('Some results are')} <a href="https://help.obsidian.md/Linking+notes+and+files/Embed+files">${t('embedded')}</a> ${t('in other notes.')}<br>
            ${t('This setting controls the maximum number of embeds to show in the search results. Set to 0 to disable.')}<br>
            ${t('Also works with Text Extractor for embedded images and documents.')}`)
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
    .setName(t('Render line return in excerpts'))
    .setDesc(
      t('Activate this option to render line returns in result excerpts.')
    )
    .addToggle(toggle =>
      toggle.setValue(settings.renderLineReturnInExcerpts).onChange(async v => {
        settings.renderLineReturnInExcerpts = v
        await saveSettings(plugin)
      })
    )

  // Show "Create note" button
  new Setting(containerEl)
    .setName(t('Show "Create note" button'))
    .setDesc(
      htmlDescription(`${t('Shows a button next to the search input, to create a note.')}
          ${t('Acts the same as the')} <code>shift ↵</code> ${t('shortcut, can be useful for mobile device users.')}`)
    )
    .addToggle(toggle =>
      toggle.setValue(settings.showCreateButton).onChange(async v => {
        settings.showCreateButton = v
        await saveSettings(plugin)
      })
    )

  // Highlight results
  new Setting(containerEl)
    .setName(t('Highlight matching words in results'))
    .setDesc(
      t(
        'Will highlight matching results when enabled. See README for more customization options.'
      )
    )
    .addToggle(toggle =>
      toggle.setValue(settings.highlight).onChange(async v => {
        settings.highlight = v
        await saveSettings(plugin)
      })
    )
}
