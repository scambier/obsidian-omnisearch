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

function createSelectedNote() {
  const { subscribe, set, update } = writable<ResultNote | null>(null)
  return {
    subscribe,
    set,
    next: () =>
      update(v => {
        const notes = get(resultNotes)
        if (!notes.length) return null
        let id = notes.findIndex(n => n.path === v?.path)
        if (id === -1) return notes[0] ?? null
        id = id < notes.length - 1 ? id + 1 : 0
        return notes[id] ?? null
      }),
    previous: () =>
      update(v => {
        const notes = get(resultNotes)
        if (!notes.length) return null
        let id = notes.findIndex(n => n.path === v?.path)
        if (id === -1) return notes[0] ?? null
        id = id > 0 ? id - 1 : notes.length - 1
        return notes[id] ?? null
      }),
  }
}

/**
 * If this field is set, the search will be limited to the given file
 */
export const inFileSearch = writable<TFile | null>(null)

/**
 * The current search query
 */
export const searchQuery = writable<string>('')

/**
 * The search results list, according to the current search query
 */
export const resultNotes = writable<ResultNote[]>([])

/**
 * The currently selected/hovered note in the results list
 */
export const selectedNote = createSelectedNote()

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
