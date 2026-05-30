import { App, FuzzySuggestModal, Notice, TFile } from 'obsidian'
import type OmnisearchPlugin from '../main'
import { applyLinkToProperty } from '../tools/link-insertion'

const NEW_PROPERTY_VALUE = '__omnisearch_new_property__'

type PropertyChoice = {
  name: string
  existing: boolean
  existingValue?: unknown
}

/**
 * Asks the user which frontmatter property to insert a link into, then writes
 * it using fileManager.processFrontMatter so Obsidian's link index picks it up.
 */
export class OmnisearchFrontmatterLinkModal extends FuzzySuggestModal<PropertyChoice> {
  constructor(
    app: App,
    private plugin: OmnisearchPlugin,
    private targetFile: TFile,
    private linkMarkdown: string
  ) {
    super(app)
    this.setPlaceholder(
      'Pick a property to receive the link (or choose "New property...")'
    )
  }

  getItems(): PropertyChoice[] {
    const fm =
      this.app.metadataCache.getFileCache(this.targetFile)?.frontmatter ?? {}
    const existing: PropertyChoice[] = Object.keys(fm)
      .filter(k => k !== 'position')
      .map(name => ({ name, existing: true, existingValue: fm[name] }))
    existing.sort((a, b) => a.name.localeCompare(b.name))
    return [{ name: 'New property...', existing: false }, ...existing]
  }

  getItemText(item: PropertyChoice): string {
    if (!item.existing) return '➕ New property...'
    const preview = describeValue(item.existingValue)
    return preview ? `${item.name}  —  ${preview}` : item.name
  }

  async onChooseItem(item: PropertyChoice): Promise<void> {
    if (!item.existing) {
      const picker = new NewPropertyNameModal(this.app, async name => {
        if (!name) return
        await this.writeProperty(name)
      })
      picker.open()
      return
    }
    await this.writeProperty(item.name)
  }

  private async writeProperty(name: string): Promise<void> {
    try {
      await this.app.fileManager.processFrontMatter(this.targetFile, fm => {
        applyLinkToProperty(fm, name, this.linkMarkdown)
      })
      new Notice(`Omnisearch: added link to "${name}"`, 3000)
    } catch (err) {
      console.error(err)
      new Notice('Omnisearch: failed to write frontmatter', 4000)
    }
  }
}

function describeValue(v: unknown): string {
  if (v == null) return ''
  if (Array.isArray(v)) return `list (${v.length})`
  if (typeof v === 'object') return 'object'
  const s = String(v)
  return s.length > 40 ? s.slice(0, 37) + '...' : s
}

/**
 * Tiny prompt for a brand-new property name. Uses a plain HTML input inside a
 * SuggestModal-style container so we don't pull in extra deps.
 */
import { Modal, Setting } from 'obsidian'

class NewPropertyNameModal extends Modal {
  private value = ''
  constructor(app: App, private onSubmit: (name: string) => void) {
    super(app)
  }
  onOpen(): void {
    this.titleEl.setText('New frontmatter property')
    new Setting(this.contentEl).setName('Property name').addText(t => {
      t.setPlaceholder('e.g. references')
      t.onChange(v => (this.value = v.trim()))
      t.inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          this.submit()
        }
      })
      setTimeout(() => t.inputEl.focus(), 0)
    })
    new Setting(this.contentEl)
      .addButton(b => b.setButtonText('Cancel').onClick(() => this.close()))
      .addButton(b =>
        b
          .setCta()
          .setButtonText('Insert')
          .onClick(() => this.submit())
      )
  }
  private submit(): void {
    const name = this.value
    this.close()
    this.onSubmit(name)
  }
}
