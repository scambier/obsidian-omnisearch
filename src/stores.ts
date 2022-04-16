import { get, writable } from 'svelte/store'
import type { ResultNote } from './globals'

// export const selectedNoteId = writable<string>('')
export const searchQuery = writable<string>('')
export const resultNotes = writable<ResultNote[]>([])

function createSelectedNote() {
  const { subscribe, set, update } = writable<ResultNote|null>(null)
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

export const selectedNote = createSelectedNote()
