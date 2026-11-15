import { t } from '../i18n'
import { Notice, Setting } from 'obsidian'
import { K_DISABLE_OMNISEARCH } from '../globals'
import type OmnisearchPlugin from '../main'
import type { OmnisearchSettings } from './utils'
import {
  htmlDescription,
  isCacheEnabled,
  isPluginDisabled,
  needsARestart,
  saveSettings,
} from './utils'

export function injectSettingsDanger(
  plugin: OmnisearchPlugin,
  settings: OmnisearchSettings,
  containerEl: HTMLElement
) {
  const database = plugin.database

  new Setting(containerEl).setName(t('Danger Zone')).setHeading()

  // Ignore diacritics
  new Setting(containerEl)
    .setName(t('Ignore diacritics'))
    .setDesc(
      htmlDescription(`${t('Normalize diacritics in search terms. Words like "brûlée" or "žluťoučký" will be indexed as "brulee" and "zlutoucky".')}<br/>
      ⚠️ <span style="color: var(--text-accent)">${t('You probably should NOT disable this.')}</span><br>
      ⚠️ <span style="color: var(--text-accent)">${t('Changing this setting will clear the cache.')}</span><br>
      ${needsARestart}`)
    )
    .addToggle(toggle =>
      toggle.setValue(settings.ignoreDiacritics).onChange(async v => {
        await database.clearCache()
        settings.ignoreDiacritics = v
        await saveSettings(plugin)
      })
    )

  new Setting(containerEl)
    .setName(t('Ignore Arabic diacritics (beta)'))
    .addToggle(toggle =>
      toggle.setValue(settings.ignoreArabicDiacritics).onChange(async v => {
        await database.clearCache()
        settings.ignoreArabicDiacritics = v
        await saveSettings(plugin)
      })
    )

  // Disable Omnisearch
  const disableDesc =
    htmlDescription(`${t('Disable Omnisearch on this device only.')}<br>
      ${needsARestart}`)
  new Setting(containerEl)
    .setName(t('Disable on this device'))
    .setDesc(disableDesc)
    .addToggle(toggle =>
      toggle.setValue(isPluginDisabled(plugin.app)).onChange(async v => {
        if (v) {
          plugin.app.saveLocalStorage(K_DISABLE_OMNISEARCH, '1')
          new Notice(`Omnisearch - ${t('Disabled. Please restart Obsidian.')}`)
        } else {
          plugin.app.saveLocalStorage(K_DISABLE_OMNISEARCH) // No value = unset
          new Notice(`Omnisearch - ${t('Enabled. Please restart Obsidian.')}`)
        }
      })
    )

  // Force save cache
  new Setting(containerEl)
    .setName(t('Force save the cache'))
    .setDesc(
      htmlDescription(`${t('Omnisearch has a security feature that automatically disables cache writing if it cannot fully perform the operation.')}<br>
      ${t('Use this option to force the cache to be saved, even if it causes a crash.')}<br>
      ⚠️ <span style="color: var(--text-accent)">${t('Enabling this setting could lead to crash loops')}</span>`)
    )
    .addToggle(toggle =>
      toggle.setValue(settings.DANGER_forceSaveCache).onChange(async v => {
        settings.DANGER_forceSaveCache = v
        await saveSettings(plugin)
      })
    )

  // Clear cache data
  if (isCacheEnabled()) {
    new Setting(containerEl)
      .setName(t('Clear cache data'))
      .setDesc(
        htmlDescription(`${t('Erase all Omnisearch cache data.')}
        ${t('Use this if Omnisearch results are inconsistent, missing, or appear outdated.')}<br>
        ${needsARestart}`)
      )
      .addButton(btn => {
        btn.setButtonText(t('Clear cache'))
        btn.onClick(async () => {
          await database.clearCache()
        })
      })
  }
}
