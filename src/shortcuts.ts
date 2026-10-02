import type { Hotkey } from 'obsidian'
import { Action, EventNames } from './globals'

export type ShortcutScope = 'vault' | 'infile' | 'both'

export interface ShortcutConfig {
  /** Short command id, used as key in the settings `shortcuts` map */
  id: string
  /** Human friendly name shown in the settings page */
  name: string
  /** Default hotkeys, used until the user overrides them in the settings page */
  defaults: Hotkey[]
  /** Event emitted on the event bus when the shortcut is triggered */
  event: string
  /** Optional payload forwarded with the event */
  data?: unknown
  /** Which search menu(s) the shortcut applies to */
  appliesTo: ShortcutScope
  /** Only active when `settings.vimLikeNavigationShortcut` is enabled */
  vimOnly?: boolean
  /** Don't trigger while the input is in IME composition */
  checkComposition?: boolean
}

export const shortcuts: ShortcutConfig[] = [
  {
    id: 'open-current',
    name: 'Open result in current pane',
    defaults: [{ modifiers: [], key: 'Enter' }],
    event: Action.Enter,
    appliesTo: 'both',
    checkComposition: true,
  },
  {
    id: 'open-new-pane',
    name: 'Open result in new pane',
    defaults: [{ modifiers: ['Mod'], key: 'Enter' }],
    event: Action.OpenInNewPane,
    appliesTo: 'both',
  },
  {
    id: 'open-new-leaf',
    name: 'Open result in new split',
    defaults: [{ modifiers: ['Mod', 'Alt'], key: 'Enter' }],
    event: Action.OpenInNewLeaf,
    appliesTo: 'vault',
  },
  {
    id: 'open-background',
    name: 'Open result in background',
    defaults: [{ modifiers: ['Mod'], key: 'O' }],
    event: Action.OpenInBackground,
    appliesTo: 'vault',
    checkComposition: true,
  },
  {
    id: 'create-note',
    name: 'Create note',
    defaults: [{ modifiers: ['Shift'], key: 'Enter' }],
    event: Action.CreateNote,
    appliesTo: 'vault',
  },
  {
    id: 'create-note-new-pane',
    name: 'Create note in new pane',
    defaults: [{ modifiers: ['Mod', 'Shift'], key: 'Enter' }],
    event: Action.CreateNote,
    data: { newLeaf: true },
    appliesTo: 'vault',
  },
  {
    id: 'insert-link',
    name: 'Insert link to result',
    defaults: [{ modifiers: ['Alt'], key: 'Enter' }],
    event: Action.InsertLink,
    appliesTo: 'vault',
  },
  {
    id: 'switch-context',
    name: 'Switch context (vault / in-file search)',
    defaults: [{ modifiers: [], key: 'Tab' }],
    event: Action.Tab,
    appliesTo: 'both',
  },
  {
    id: 'toggle-excerpts',
    name: 'Toggle excerpts',
    defaults: [{ modifiers: ['Mod'], key: 'G' }],
    event: EventNames.ToggleExcerpts,
    appliesTo: 'both',
  },
  {
    id: 'history-prev',
    name: 'Previous search history',
    defaults: [{ modifiers: ['Alt'], key: 'ArrowUp' }],
    event: Action.PrevSearchHistory,
    appliesTo: 'vault',
  },
  {
    id: 'history-next',
    name: 'Next search history',
    defaults: [{ modifiers: ['Alt'], key: 'ArrowDown' }],
    event: Action.NextSearchHistory,
    appliesTo: 'vault',
  },
  {
    id: 'navigate-up',
    name: 'Navigate up',
    defaults: [{ modifiers: [], key: 'ArrowUp' }],
    event: Action.ArrowUp,
    appliesTo: 'both',
  },
  {
    id: 'navigate-down',
    name: 'Navigate down',
    defaults: [{ modifiers: [], key: 'ArrowDown' }],
    event: Action.ArrowDown,
    appliesTo: 'both',
  },
  {
    id: 'navigate-up-vim',
    name: 'Navigate up (Vim style)',
    defaults: [{ modifiers: ['Mod'], key: 'K' }, { modifiers: ['Mod'], key: 'P' }],
    event: Action.ArrowUp,
    appliesTo: 'both',
    vimOnly: true,
  },
  {
    id: 'navigate-down-vim',
    name: 'Navigate down (Vim style)',
    defaults: [{ modifiers: ['Mod'], key: 'J' }, { modifiers: ['Mod'], key: 'N' }],
    event: Action.ArrowDown,
    appliesTo: 'both',
    vimOnly: true,
  },
]

export function defaultShortcuts(): Record<string, Hotkey[]> {
  const result: Record<string, Hotkey[]> = {}
  for (const shortcut of shortcuts) {
    result[shortcut.id] = shortcut.defaults
  }
  return result
}

export function getShortcutHotkeys(
  custom: Record<string, Hotkey[]> | undefined,
  shortcut: ShortcutConfig
): Hotkey[] {
  return custom?.[shortcut.id] ?? shortcut.defaults
}