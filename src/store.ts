import { writable } from 'svelte/store'

export const selectedNoteId = writable<string>()
