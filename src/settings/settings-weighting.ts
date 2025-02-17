import { Setting, SliderComponent } from 'obsidian'
import { getDefaultSettings } from 'src/settings'
import type { OmnisearchSettings } from './utils'
import { saveSettings } from './utils'
import type { WeightingSettings } from './utils'
import type OmnisearchPlugin from 'src/main'
import { RecencyCutoff } from 'src/globals'

export function injectSettingsWeighting(
  plugin: OmnisearchPlugin,
  settings: OmnisearchSettings,
  containerEl: HTMLElement,
  refreshDisplay: () => void
) {
  function weightSlider(
    cb: SliderComponent,
    key: keyof WeightingSettings
  ): void {
    cb.setLimits(1, 10, 0.5)
      .setValue(settings[key])
      .setDynamicTooltip()
      .onChange(async v => {
        settings[key] = v
        await saveSettings(plugin)
      })
  }

  const defaultSettings = getDefaultSettings(plugin.app)

  new Setting(containerEl).setName('Results weighting').setHeading()

  new Setting(containerEl)
    .setName(
      `File name & declared aliases (default: ${defaultSettings.weightBasename})`
    )
    .addSlider(cb => weightSlider(cb, 'weightBasename'))

  new Setting(containerEl)
    .setName(`File directory (default: ${defaultSettings.weightDirectory})`)
    .addSlider(cb => weightSlider(cb, 'weightDirectory'))

  new Setting(containerEl)
    .setName(`Headings level 1 (default: ${defaultSettings.weightH1})`)
    .addSlider(cb => weightSlider(cb, 'weightH1'))

  new Setting(containerEl)
    .setName(`Headings level 2 (default: ${defaultSettings.weightH2})`)
    .addSlider(cb => weightSlider(cb, 'weightH2'))

  new Setting(containerEl)
    .setName(`Headings level 3 (default: ${defaultSettings.weightH3})`)
    .addSlider(cb => weightSlider(cb, 'weightH3'))

  new Setting(containerEl)
    .setName(`Tags (default: ${defaultSettings.weightUnmarkedTags})`)
    .addSlider(cb => weightSlider(cb, 'weightUnmarkedTags'))

  new Setting(containerEl)
    .setName('Header properties fields')
    .setDesc(
      'You can set custom weights for values of header properties (e.g. "keywords"). Weights under 1.0 will downrank the results.'
    )

  for (let i = 0; i < settings.weightCustomProperties.length; i++) {
    const item = settings.weightCustomProperties[i]
    const el = new Setting(containerEl).setName((i + 1).toString() + '.')
    el.settingEl.style.paddingLeft = '2em'

    // TODO: add autocompletion from app.metadataCache.getAllPropertyInfos()
    el.addText(text => {
      text
        .setPlaceholder('Property name')
        .setValue(item.name)
        .onChange(async v => {
          item.name = v
          await saveSettings(plugin)
        })
    })
      .addSlider(cb => {
        cb.setLimits(0.1, 5, 0.1)
          .setValue(item.weight)
          .setDynamicTooltip()
          .onChange(async v => {
            item.weight = v
            await saveSettings(plugin)
          })
      })
      // Remove the tag
      .addButton(btn => {
        btn.setButtonText('Remove')
        btn.onClick(async () => {
          settings.weightCustomProperties.splice(i, 1)
          await saveSettings(plugin)
          refreshDisplay()
        })
      })
  }

  // Add a new custom tag
  new Setting(containerEl).addButton(btn => {
    btn.setButtonText('Add a new property')
    btn.onClick(_cb => {
      settings.weightCustomProperties.push({ name: '', weight: 1 })
      refreshDisplay()
    })
  })

  new Setting(containerEl)
    .setName('Recency boost (experimental)')
    .setDesc(
      'Files that have been modified more recently than [selected cutoff] are given a higher rank.'
    )
    .addDropdown(dropdown =>
      dropdown
        .addOptions({
          [RecencyCutoff.Disabled]: 'Disabled',
          [RecencyCutoff.Day]: '24 hours',
          [RecencyCutoff.Week]: '7 days',
          [RecencyCutoff.Month]: '30 days',
        })
        .setValue(settings.recencyBoost)
        .onChange(async v => {
          settings.recencyBoost = v as RecencyCutoff
          await saveSettings(plugin)
        })
    )
}
