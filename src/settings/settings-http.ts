import { Platform, Setting } from 'obsidian'
import type { OmnisearchSettings } from './utils'
import { saveSettings } from './utils'
import { htmlDescription } from './utils'
import type OmnisearchPlugin from 'src/main'

export function injectSettingsHttp(
  plugin: OmnisearchPlugin,
  settings: OmnisearchSettings,
  containerEl: HTMLElement
) {
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
            plugin.apiHttpServer.listen(settings.httpApiPort)
          } else {
            plugin.apiHttpServer.close()
          }
          await saveSettings(plugin)
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
            plugin.apiHttpServer.close()
            plugin.apiHttpServer.listen(settings.httpApiPort)
          }
          await saveSettings(plugin)
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
          await saveSettings(plugin)
        })
      )
  }
}
