import { get, writable } from 'svelte/store'
import type { IndexedNote } from './globals'
import type OmnisearchPlugin from './main'

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
 * A reference to the plugin instance
 */
export const plugin = writable<OmnisearchPlugin>()

/**
 * The entire list of indexed notes, constantly kept up-to-date.
 */
export const indexedNotes = createIndexedNotes()
