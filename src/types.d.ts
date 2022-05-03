import { type Vault } from 'obsidian'

declare module 'obsidian' {
  interface Vault {
    config?: {
      userIgnoreFilters?: string[]
    }
  }
}
