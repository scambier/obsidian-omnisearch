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
        let id = notes.findIndex(n => n.path === v?.path)
        if (!notes.length) return null
        if (id === -1) return notes[0]
        id = id < notes.length - 1 ? id + 1 : 0
        return notes[id]
      }),
    previous: () =>
      update(v => {
        const notes = get(resultNotes)
        let id = notes.findIndex(n => n.path === v?.path)
        if (!notes.length) return null
        if (id === -1) return notes[0]
        id = id > 0 ? id - 1 : notes.length - 1
        return notes[id]
      }),
  }
}

export const searchQuery = writable<string>('')
export const resultNotes = writable<ResultNote[]>([])
export const plugin = writable<OmnisearchPlugin>()
export const modal = writable<OmnisearchModal>()
export const selectedNote = createSelectedNote()
export const indexedNotes = createIndexedNotes()
