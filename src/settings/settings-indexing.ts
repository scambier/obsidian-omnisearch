import { t } from '../i18n'
import { Setting, debounce } from 'obsidian'
import type OmnisearchPlugin from '../main'
import type { OmnisearchSettings } from './utils'
import { htmlDescription, saveSettings } from './utils'

export function injectSettingsIndexing(
  plugin: OmnisearchPlugin,
  settings: OmnisearchSettings,
  containerEl: HTMLElement
) {
  const textExtractor = plugin.getTextExtractor()
  const aiImageAnalyzer = plugin.getAIImageAnalyzer()
  const database = plugin.database

  const clearCacheDebounced = debounce(async () => {
    await database.clearCache()
  }, 1000)

  new Setting(containerEl)
    .setName(t('Indexing'))
    .setHeading()
    .setDesc(
      htmlDescription(`<div style="margin-top: 1em; color: var(--text-accent)">${t('⚠️ Changing indexing settings will clear the cache, and requires a restart of Obsidian.')}</div><br/>
        ${
          textExtractor
            ? `👍 ${t('You have installed')} <a href="https://github.com/scambier/obsidian-text-extractor">Text Extractor</a>, ${t('Omnisearch can use it to index PDFs and images contents.')}
            <br />${t('Text extraction only works on desktop, but the cache can be synchronized with your mobile device.')}`
            : `⚠️ ${t('Omnisearch requires')} <a href="https://github.com/scambier/obsidian-text-extractor">Text Extractor</a> ${t('to index PDFs and images.')}`
        }
        ${
          aiImageAnalyzer
            ? `<br/>👍 ${t('You have installed')} <a href="https://github.com/Swaggeroo/obsidian-ai-image-analyzer">AI Image Analyzer</a>, ${t('Omnisearch can use it to index images contents with AI.')}`
            : `<br/>⚠️ ${t('Omnisearch requires')} <a href="https://github.com/Swaggeroo/obsidian-ai-image-analyzer">AI Image Analyzer</a> ${t('to index images with AI.')}`
        }`)
    )

  // PDF Indexing
  new Setting(containerEl)
    .setName(
      `${t('PDFs content indexing')} ${textExtractor ? '' : t('⚠️ Disabled')}`
    )
    .setDesc(
      htmlDescription(
        t(
          'Omnisearch will use Text Extractor to index the content of your PDFs.'
        )
      )
    )
    .addToggle(toggle =>
      toggle.setValue(settings.PDFIndexing).onChange(async v => {
        await database.clearCache()
        settings.PDFIndexing = v
        await saveSettings(plugin)
      })
    )
    .setDisabled(!textExtractor)

  // Images Indexing
  new Setting(containerEl)
    .setName(
      `${t('Images OCR indexing')} ${textExtractor ? '' : t('⚠️ Disabled')}`
    )
    .setDesc(
      htmlDescription(
        t(
          'Omnisearch will use Text Extractor to OCR your images and index their content.'
        )
      )
    )
    .addToggle(toggle =>
      toggle.setValue(settings.imagesIndexing).onChange(async v => {
        await database.clearCache()
        settings.imagesIndexing = v
        await saveSettings(plugin)
      })
    )
    .setDisabled(!textExtractor)

  // Office Documents Indexing
  const indexOfficesDesc = htmlDescription(
    `${t('Omnisearch will use Text Extractor to index the content of your office documents (currently')} <pre style="display:inline">.docx</pre> ${t('and')} <pre style="display:inline">.xlsx</pre>).`
  )
  new Setting(containerEl)
    .setName(
      `${t('Documents content indexing')} ${textExtractor ? '' : t('⚠️ Disabled')}`
    )
    .setDesc(indexOfficesDesc)
    .addToggle(toggle =>
      toggle.setValue(settings.officeIndexing).onChange(async v => {
        await database.clearCache()
        settings.officeIndexing = v
        await saveSettings(plugin)
      })
    )
    .setDisabled(!textExtractor)

  // AI Images Indexing
  const aiIndexImagesDesc =
    htmlDescription(`${t('Omnisearch will use AI Image Analyzer to index the content of your images with AI.')}<br/>
    ⚠️ <span style="color: var(--text-accent)">${t('If both AI Image Analyzer and Text Extractor are enabled, Text Extractor will only be used as a fallback.')}</span>`)
  new Setting(containerEl)
    .setName(
      `${t('Images AI indexing')} ${aiImageAnalyzer ? '' : t('⚠️ Disabled')}`
    )
    .setDesc(aiIndexImagesDesc)
    .addToggle(toggle =>
      toggle.setValue(settings.aiImageIndexing).onChange(async v => {
        await database.clearCache()
        settings.aiImageIndexing = v
        await saveSettings(plugin)
      })
    )
    .setDisabled(!aiImageAnalyzer)

  // Index filenames of unsupported files
  new Setting(containerEl)
    .setName(t('Index paths of unsupported files'))
    .setDesc(
      htmlDescription(`
      ${t('Omnisearch can index file names of unsupported files, such as .mp4 or non-extracted PDFs and images.')}<br/>
      ${t('"Obsidian setting" will respect the value of "Files & Links > Detect all file extensions".')}`)
    )
    .addDropdown(dropdown => {
      dropdown
        .addOptions({
          yes: t('Yes'),
          no: t('No'),
          default: t('Obsidian setting'),
        })
        .setValue(settings.unsupportedFilesIndexing)
        .onChange(async v => {
          clearCacheDebounced()
          settings.unsupportedFilesIndexing =
            v as OmnisearchSettings['unsupportedFilesIndexing']
          await saveSettings(plugin)
        })
    })

  // Custom display title
  new Setting(containerEl)
    .setName(t('Set frontmatter property key as title'))
    .setDesc(
      htmlDescription(
        t(`If you have a custom property in your notes that you want to use as the title in search results. If you set this to '#heading', then use the first heading from a file as the title.<br>
          Leave empty to disable.`)
      )
    )
    .addText(component => {
      component.setValue(settings.displayTitle).onChange(async v => {
        clearCacheDebounced()
        settings.displayTitle = v
        await saveSettings(plugin)
      })
    })

  // Additional text files to index
  new Setting(containerEl)
    .setName(t('Additional TEXT files to index'))
    .setDesc(
      htmlDescription(
        t(`In addition to standard <code>md</code> files, Omnisearch can also index other <strong style="color: var(--text-accent)">PLAINTEXT</strong> files.<br/>
      Add extensions separated by a space, without the dot. Example: "<code>txt org csv</code>".<br />
      ⚠️ <span style="color: var(--text-accent)">Using extensions of non-plaintext files (like .pptx) WILL cause crashes,
      because Omnisearch will try to index their content.</span>`)
      )
    )
    .addText(component => {
      component
        .setValue(settings.indexedFileTypes.join(' '))
        .setPlaceholder(t('Example: txt org csv'))
        .onChange(async v => {
          await database.clearCache()
          settings.indexedFileTypes = v.split(' ')
          await saveSettings(plugin)
        })
    })

  // Index files without extension
  new Setting(containerEl)
    .setName(t('Index files without extension'))
    .setDesc(
      htmlDescription(
        t(`Enable this to also index files that have <strong style="color: var(--text-accent)">no file extension</strong>.<br/>
      These files will be indexed as plaintext files.`)
      )
    )
    .addToggle(toggle => {
      toggle.setValue(settings.indexFilesWithoutExtension).onChange(async v => {
        await database.clearCache()
        settings.indexFilesWithoutExtension = v
        await saveSettings(plugin)
      })
    })
}
