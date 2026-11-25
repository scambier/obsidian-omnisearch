// Obsidian API is only available at runtime inside the host app.
// Tests only exercise pure functions, so stub the functions they use.

type Frontmatter = Record<string, unknown>

export function parseFrontMatterAliases(
  frontmatter: Frontmatter
): string[] | undefined {
  const aliases = frontmatter['aliases']
  if (aliases == null) return undefined
  if (Array.isArray(aliases)) return aliases as string[]
  if (typeof aliases === 'string') {
    return aliases
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }
  return undefined
}

export function getAllTags(
  metadata: {
    frontmatter?: Record<string, unknown>
    tags?: { tag: string }[]
  }
): string[] {
  const frontmatterTags = metadata.frontmatter?.['tags']
  const tags = Array.isArray(frontmatterTags)
    ? frontmatterTags
    : typeof frontmatterTags === 'string'
      ? [frontmatterTags]
      : []

  return [
    ...tags.map(tag => `#${tag}`),
    ...(metadata.tags?.map(tag => tag.tag) ?? []),
  ]
}

export class MarkdownView {}
export class TFile {}
export class WorkspaceLeaf {}
