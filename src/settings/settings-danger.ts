import { Notice, Setting } from 'obsidian'
import type { OmnisearchSettings } from './utils'
import { isCacheEnabled } from './utils'
import { saveSettings } from './utils'
import { htmlDescription, isPluginDisabled, needsARestart } from './utils'
import type OmnisearchPlugin from 'src/main'
import { K_DISABLE_OMNISEARCH } from 'src/globals'

export function injectSettingsDanger(
  plugin: OmnisearchPlugin,
  settings: OmnisearchSettings,
  containerEl: HTMLElement
) {
  const database = plugin.database

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
        await saveSettings(plugin)
      })
    )

  new Setting(containerEl)
    .setName('Ignore Arabic diacritics (beta)')
    .addToggle(toggle =>
      toggle.setValue(settings.ignoreArabicDiacritics).onChange(async v => {
        await database.clearCache()
        settings.ignoreArabicDiacritics = v
        await saveSettings(plugin)
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
      toggle.setValue(isPluginDisabled(plugin.app)).onChange(async v => {
        if (v) {
          plugin.app.saveLocalStorage(K_DISABLE_OMNISEARCH, '1')
          new Notice('Omnisearch - Disabled. Please restart Obsidian.')
        } else {
          plugin.app.saveLocalStorage(K_DISABLE_OMNISEARCH) // No value = unset
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
        await saveSettings(plugin)
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
}
