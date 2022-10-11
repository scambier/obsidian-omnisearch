import type { MetadataCache, ViewState, Vault } from 'obsidian'

declare module 'obsidian' {
  interface MetadataCache {
    isUserIgnored?(path: string): boolean
  }

  interface FrontMatterCache {
    aliases?: string[] | string
    tags?: string[] | string
  }

  interface ViewState {
    state?: {
      file?: string
    }
  }

  interface Vault {
    getConfig(string): unknown
  }
}


