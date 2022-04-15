import { writable } from 'svelte/store'
import type { ResultNote } from './globals'

export const selectedNoteId = writable<string>('')
export const searchQuery = writable<string>('')
export const resultNotes = writable<ResultNote[]>([])
