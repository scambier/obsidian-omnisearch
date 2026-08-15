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
