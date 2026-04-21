import type { MetadataCache, ViewState, Vault } from 'obsidian'

declare module 'obsidian' {
  interface MetadataCache {
    isUserIgnored?(path: string): boolean
  }

  interface ViewState {
    state?: {
      file?: string
    }
  }

  interface Vault {
    getConfig(string): unknown
  }

  interface WorkspaceLeaf {
    openFile(
      file: TFile,
      openState?: OpenViewState
    ): Promise<void>
  }

  interface App {
    appId: string
    loadLocalStorage(key: string): string | null
    saveLocalStorage(key: string, value?: string): void
  }
}
