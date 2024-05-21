import type { App } from 'obsidian'

let obsidianApp: App | null = null

export function setObsidianApp(app: App) {
  obsidianApp = app
}

/**
 * Helper function to get the Obsidian app instance.
 */
export function getObsidianApp() {
  if (!obsidianApp) {
    throw new Error('Obsidian app not set')
  }
  return obsidianApp as App
}
