import { Setting } from 'obsidian'
import type { OmnisearchSettings } from './utils'
import { saveSettings } from './utils'
import { htmlDescription } from './utils'
import type OmnisearchPlugin from 'src/main'
import { debounce } from 'lodash-es'

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
    .setName('Indexing')
    .setHeading()
    .setDesc(
      htmlDescription(`⚠️ <span style="color: var(--text-accent)">Changing indexing settings will clear the cache, and requires a restart of Obsidian.</span><br/><br/>
        ${
          textExtractor
            ? `👍 You have installed <a href="https://github.com/scambier/obsidian-text-extractor">Text Extractor</a>, Omnisearch can use it to index PDFs and images contents.
            <br />Text extraction only works on desktop, but the cache can be synchronized with your mobile device.`
            : `⚠️ Omnisearch requires <a href="https://github.com/scambier/obsidian-text-extractor">Text Extractor</a> to index PDFs and images.`
        }
        ${
          aiImageAnalyzer
            ? `<br/>👍 You have installed <a href="https://github.com/Swaggeroo/obsidian-ai-image-analyzer">AI Image Analyzer</a>, Omnisearch can use it to index images contents with ai.`
            : `<br/>⚠️ Omnisearch requires <a href="https://github.com/Swaggeroo/obsidian-ai-image-analyzer">AI Image Analyzer</a> to index images with ai.`
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
        await saveSettings(plugin)
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
        await saveSettings(plugin)
      })
    )
    .setDisabled(!textExtractor)

  // Office Documents Indexing
  const indexOfficesDesc = new DocumentFragment()
  indexOfficesDesc.createSpan({}, span => {
    span.innerHTML = `Omnisearch will use Text Extractor to index the content of your office documents (currently <pre style="display:inline">.docx</pre> and <pre style="display:inline">.xlsx</pre>).`
  })
  new Setting(containerEl)
    .setName(`Documents content indexing ${textExtractor ? '' : '⚠️ Disabled'}`)
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
  const aiIndexImagesDesc = new DocumentFragment()
  aiIndexImagesDesc.createSpan({}, span => {
    span.innerHTML = `Omnisearch will use AI Image Analyzer to index the content of your images with ai.<br/>
    ⚠️ <span style="color: var(--text-accent)">If both AI Image Analyzer and Text Extractor are enabled, Text Extractor will only be used as a fallback.</span>`
  })
  new Setting(containerEl)
    .setName(`Images AI indexing ${aiImageAnalyzer ? '' : '⚠️ Disabled'}`)
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
          await saveSettings(plugin)
        })
    })

  // Custom display title
  new Setting(containerEl)
    .setName('Set frontmatter property key as title')
    .setDesc(
      htmlDescription(`If you have a custom property in your notes that you want to use as the title in search results. If you set this to '#heading', then use the first heading from a file as the title.<br>
          Leave empty to disable.`)
    )
    .addText(component => {
      component.setValue(settings.displayTitle).onChange(async v => {
        await clearCacheDebounced()
        settings.displayTitle = v
        await saveSettings(plugin)
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
          await saveSettings(plugin)
        })
    })
}
