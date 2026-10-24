export {} // treat this file as a module

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

  interface App {
    appId: string
    loadLocalStorage(key: string): string | null
    saveLocalStorage(key: string, value?: string): void
  }
}
