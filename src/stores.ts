import { writable } from 'svelte/store'
import type OmnisearchPlugin from './main'

/**
 * A reference to the plugin instance
 */
export const plugin = writable<OmnisearchPlugin>()
