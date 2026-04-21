import type { MetadataCache, ViewState, Vault } from 'obsidian'

declare module 'obsidian' {
  interface MetadataCache {
    isUserIgnored?(path: string): boolean
  }

  interface ViewState {
    state?: Record<string, unknown>
  }

  interface Vault {
    getConfig(key: string): unknown
  }

  interface WorkspaceLeaf {
    openFile(
      file: TFile,
      state?: { active?: boolean; eState?: Record<string, unknown> }
    ): Promise<void>
  }

  interface App {
    appId: string
    loadLocalStorage(key: string): string | null
    saveLocalStorage(key: string, value?: string): void
  }
}
