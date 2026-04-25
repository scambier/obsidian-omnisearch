// Minimal Obsidian module mock for Jest. Only the symbols our code references
// at runtime need real values; types are erased.

export const Platform = {
  isMacOS: false,
  isMobile: false,
  isDesktop: true,
  isDesktopApp: true,
}

export function getAllTags(meta: any): string[] | null {
  if (!meta) return null
  const out: string[] = []
  if (Array.isArray(meta.tags)) {
    for (const t of meta.tags) {
      if (typeof t === 'string') out.push(t.startsWith('#') ? t : `#${t}`)
      else if (t && typeof t.tag === 'string') out.push(t.tag)
    }
  }
  if (meta.frontmatter?.tags) {
    const fmTags = Array.isArray(meta.frontmatter.tags)
      ? meta.frontmatter.tags
      : [meta.frontmatter.tags]
    for (const t of fmTags) out.push(t.startsWith('#') ? t : `#${t}`)
  }
  return out
}

export function parseFrontMatterAliases(fm: any): string[] | null {
  if (!fm) return null
  const a = fm.aliases ?? fm.alias
  if (!a) return null
  return Array.isArray(a) ? a : [a]
}

export class Modal {}
export class FuzzySuggestModal {}
export class Notice {
  constructor(_msg: string, _ms?: number) {}
}
export class TFile {}
export class MarkdownView {}
export class Setting {
  constructor(_el: any) {}
  setName(_n: string) {
    return this
  }
  addText(_cb: any) {
    return this
  }
  addButton(_cb: any) {
    return this
  }
}
