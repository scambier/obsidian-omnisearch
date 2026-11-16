import { t } from '../i18n'
import { Setting, SliderComponent } from 'obsidian'
import { RecencyCutoff } from '../globals'
import type OmnisearchPlugin from '../main'
import { getDefaultSettings } from './index'
import type { OmnisearchSettings, WeightingSettings } from './utils'
import { saveSettings } from './utils'

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

  new Setting(containerEl).setName(t('Results weighting')).setHeading()

  new Setting(containerEl)
    .setName(
      `${t('File name & declared aliases')} (${t('default')}: ${defaultSettings.weightBasename})`
    )
    .addSlider(cb => weightSlider(cb, 'weightBasename'))

  new Setting(containerEl)
    .setName(
      `${t('File directory')} (${t('default')}: ${defaultSettings.weightDirectory})`
    )
    .addSlider(cb => weightSlider(cb, 'weightDirectory'))

  new Setting(containerEl)
    .setName(
      `${t('Headings level 1')} (${t('default')}: ${defaultSettings.weightH1})`
    )
    .addSlider(cb => weightSlider(cb, 'weightH1'))

  new Setting(containerEl)
    .setName(
      `${t('Headings level 2')} (${t('default')}: ${defaultSettings.weightH2})`
    )
    .addSlider(cb => weightSlider(cb, 'weightH2'))

  new Setting(containerEl)
    .setName(
      `${t('Headings level 3')} (${t('default')}: ${defaultSettings.weightH3})`
    )
    .addSlider(cb => weightSlider(cb, 'weightH3'))

  new Setting(containerEl)
    .setName(
      `${t('Tags')} (${t('default')}: ${defaultSettings.weightUnmarkedTags})`
    )
    .addSlider(cb => weightSlider(cb, 'weightUnmarkedTags'))

  new Setting(containerEl)
    .setName(t('Header properties fields'))
    .setDesc(
      t(
        'You can set custom weights for values of header properties (e.g. "keywords"). Weights under 1.0 will downrank the results.'
      )
    )

  for (let i = 0; i < settings.weightCustomProperties.length; i++) {
    const item = settings.weightCustomProperties[i]
    const el = new Setting(containerEl).setName((i + 1).toString() + '.')
    el.settingEl.style.paddingLeft = '2em'

    // TODO: add autocompletion from app.metadataCache.getAllPropertyInfos()
    el.addText(text => {
      text
        .setPlaceholder(t('Property name'))
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
        btn.setButtonText(t('Remove'))
        btn.onClick(async () => {
          settings.weightCustomProperties.splice(i, 1)
          await saveSettings(plugin)
          refreshDisplay()
        })
      })
  }

  // Add a new custom tag
  new Setting(containerEl).addButton(btn => {
    btn.setButtonText(t('Add a new property'))
    btn.onClick(_cb => {
      settings.weightCustomProperties.push({ name: '', weight: 1 })
      refreshDisplay()
    })
  })

  new Setting(containerEl)
    .setName(t('Recency boost (experimental)'))
    .setDesc(
      t(
        'Files that have been modified more recently than [selected cutoff] are given a higher rank.'
      )
    )
    .addDropdown(dropdown =>
      dropdown
        .addOptions({
          [RecencyCutoff.Disabled]: t('Disabled'),
          [RecencyCutoff.Day]: t('24 hours'),
          [RecencyCutoff.Week]: t('7 days'),
          [RecencyCutoff.Month]: t('30 days'),
        })
        .setValue(settings.recencyBoost)
        .onChange(async v => {
          settings.recencyBoost = v as RecencyCutoff
          await saveSettings(plugin)
        })
    )
}
