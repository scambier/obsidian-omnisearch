import { type MetadataCache } from 'obsidian'

declare module 'obsidian' {
  interface MetadataCache {
    isUserIgnored(path:string):boolean
  }
}
