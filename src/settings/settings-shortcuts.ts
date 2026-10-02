import { Platform, Setting, setIcon, type Hotkey, type Modifier } from 'obsidian'
import type OmnisearchPlugin from '../main'
import {
  defaultShortcuts,
  getShortcutHotkeys,
  shortcuts,
  type ShortcutConfig,
} from '../shortcuts'
import { getAltKeyLabel, getCtrlKeyLabel } from '../tools/utils'
import type { OmnisearchSettings } from './utils'
import { saveSettings } from './utils'

let recordingCleanup: (() => void) | null = null

export function injectSettingsShortcuts(
  plugin: OmnisearchPlugin,
  settings: OmnisearchSettings,
  containerEl: HTMLElement
) {
  new Setting(containerEl).setName('Keyboard shortcuts').setHeading()

  new Setting(containerEl)
    .setName('Customize keyboard shortcuts')
    .setDesc(
      'These shortcuts are available ONLY while the Omnisearch search menu is open; ' +
        'outside of the search menu they do nothing. Click the + button to record a new ' +
        'shortcut, click an existing shortcut to replace it, or click the × to remove it. ' +
        'Press Esc while recording to cancel.'
    )
    .addButton(button =>
      button
        .setButtonText('Reset to defaults')
        .setWarning()
        .onClick(async () => {
          settings.shortcuts = defaultShortcuts()
          await saveSettings(plugin)
          for (const render of renders) render()
        })
    )

  const renders: (() => void)[] = []

  for (const shortcut of shortcuts) {
    renders.push(renderShortcutRow(shortcut))
  }

  function getDisplayedHotkeys(shortcut: ShortcutConfig): Hotkey[] {
    const seen = new Set<string>()
    return getShortcutHotkeys(settings.shortcuts, shortcut).filter(hotkey => {
      const label = formatHotkey(hotkey)
      if (seen.has(label)) return false
      seen.add(label)
      return true
    })
  }

  function renderShortcutRow(shortcut: ShortcutConfig): () => void {
    const row = new Setting(containerEl).setName(shortcut.name)
    if (shortcut.vimOnly) {
      row.setDesc('Only active when "Set Vim like navigation keys" is enabled.')
    }

    const listEl = row.controlEl.createDiv({ cls: 'omnisearch-hotkey-list' })
    const addButton = row.controlEl.createEl('button', {
      cls: 'clickable-icon',
      attr: { 'aria-label': 'Add hotkey' },
    })
    setIcon(addButton, 'plus')

    const render = () => {
      listEl.empty()
      const hotkeys = getDisplayedHotkeys(shortcut)
      hotkeys.forEach((hotkey, index) => {
        const chip = listEl.createSpan({ cls: 'setting-hotkey' })
        chip.setText(formatHotkey(hotkey))
        const removeIcon = chip.createSpan({
          cls: 'setting-hotkey-icon clickable-icon',
        })
        setIcon(removeIcon, 'x')
        removeIcon.addEventListener('click', evt => {
          evt.stopPropagation()
          const next = [...hotkeys]
          next.splice(index, 1)
          settings.shortcuts[shortcut.id] = next
          void saveSettings(plugin).then(render)
        })
        chip.addEventListener('click', evt => {
          evt.stopPropagation()
          startRecording(shortcut, index, chip, render)
        })
      })
    }

    addButton.addEventListener('click', evt => {
      evt.stopPropagation()
      recordingCleanup?.()
      const chip = listEl.createSpan({ cls: 'setting-hotkey' })
      chip.setText('Press shortcut')
      startRecording(shortcut, -1, chip, render)
    })

    render()
    return render
  }

  function startRecording(
    shortcut: ShortcutConfig,
    index: number,
    chip: HTMLElement,
    onDone: () => void
  ) {
    recordingCleanup?.()
    chip.setText('Press shortcut')
    chip.addClass('is-recording')

    const cancel = () => {
      recordingCleanup?.()
      onDone()
    }

    let lastKeyEvent: KeyboardEvent | null = null
    const onKeydown = (evt: KeyboardEvent) => {
      if (evt === lastKeyEvent) return
      lastKeyEvent = evt
      if (evt.key === 'Escape' || evt.key === 'Esc') {
        evt.preventDefault()
        evt.stopPropagation()
        cancel()
        return
      }
      evt.preventDefault()
      evt.stopPropagation()
      const key = getKeyName(evt)
      if (!key) return
      const hotkey: Hotkey = { modifiers: getPressedModifiers(evt), key }
      const current = getDisplayedHotkeys(shortcut)
      if (index === -1) {
        settings.shortcuts[shortcut.id] = [...current, hotkey]
      } else {
        const next = [...current]
        next[index] = hotkey
        settings.shortcuts[shortcut.id] = next
      }
      recordingCleanup?.()
      void saveSettings(plugin)
      onDone()
    }

    const onMouseDown = (evt: MouseEvent) => {
      if (!chip.contains(evt.target as Node)) {
        cancel()
      }
    }

    recordingCleanup = () => {
      document.removeEventListener('keydown', onKeydown, true)
      window.removeEventListener('keydown', onKeydown, true)
      document.removeEventListener('mousedown', onMouseDown, true)
      chip.removeClass('is-recording')
      recordingCleanup = null
    }
    document.addEventListener('keydown', onKeydown, true)
    window.addEventListener('keydown', onKeydown, true)
    document.addEventListener('mousedown', onMouseDown, true)
  }
}

function getPressedModifiers(evt: KeyboardEvent): Modifier[] {
  const modifiers: Modifier[] = []
  if (evt.ctrlKey) modifiers.push('Ctrl')
  if (evt.metaKey) modifiers.push('Meta')
  if (evt.shiftKey) modifiers.push('Shift')
  if (evt.altKey) modifiers.push('Alt')
  return modifiers
}

function getKeyName(evt: KeyboardEvent): string | null {
  if (
    ['Control', 'Meta', 'Shift', 'Alt', 'CapsLock', 'NumLock', 'ScrollLock', 'Escape', 'Esc'].includes(
      evt.key
    )
  ) {
    return null
  }
  if (evt.key === ' ') return 'Space'
  if (evt.key.length === 1) return evt.key.toUpperCase()
  return evt.key
}

function formatKey(key: string): string {
  if (key === 'Escape') return 'Esc'
  if (key === ' ') return 'Space'
  return key
}

export function formatHotkey(hotkey: Hotkey): string {
  const labels: Record<string, string> = {
    Mod: getCtrlKeyLabel(),
    Ctrl: 'Ctrl',
    Meta: Platform.isMacOS ? '⌘' : 'Win',
    Shift: 'Shift',
    Alt: getAltKeyLabel(),
  }
  return [...hotkey.modifiers.map(m => labels[m] ?? m), formatKey(hotkey.key)].join(
    ' + '
  )
}