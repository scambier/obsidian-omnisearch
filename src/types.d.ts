import type { MetadataCache, ViewState } from 'obsidian'

declare module 'obsidian' {
  interface MetadataCache {
    isUserIgnored?(path: string): boolean
  }

  interface FrontMatterCache {
    aliases?: string[] | string
  }

  interface ViewState {
    state?: {
      file?: string
    }
  }
}
