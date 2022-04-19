import type { TFile } from 'obsidian'
import { get, writable } from 'svelte/store'
import type { IndexedNote, ResultNote } from './globals'
import type OmnisearchPlugin from './main'
import type { OmnisearchModal } from './modal'

function createIndexedNotes() {
  const { subscribe, set, update } = writable<Record<string, IndexedNote>>({})
  return {
    subscribe,
    set,
    add(note: IndexedNote) {
      update(notes => {
        notes[note.path] = note
        return notes
      })
    },
    remove(path: string) {
      update(notes => {
        delete notes[path]
        return notes
      })
    },
    get(path: string): IndexedNote | undefined {
      return get(indexedNotes)[path]
    },
  }
}

/**
 * If this field is set, the search will be limited to the given file
 */
// export const inFileSearch = writable<TFile | null>(null)

/**
 * A reference to the plugin instance
 */
export const plugin = writable<OmnisearchPlugin>()

/**
 * A reference to the modal instance
 */
export const modal = writable<OmnisearchModal>()

/**
 * The entire list of indexed notes, constantly kept up-to-date.
 */
export const indexedNotes = createIndexedNotes()

export const lastSearch = writable('')
