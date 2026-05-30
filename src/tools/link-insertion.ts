// Pure helpers for link insertion. No Obsidian runtime imports so these are
// trivially testable in Jest without mocking the editor.

export type Pos = { line: number; ch: number }

export type SelectionRange = {
  from: Pos
  to: Pos
}

/**
 * Returns the {from, to} pair such that `from` is always before `to` in
 * document order. Selections in Obsidian can be made in either direction;
 * `replaceRange` doesn't care, but `setCursor(from + linkLength)` does.
 */
export function orderSelection(anchor: Pos, head: Pos): SelectionRange {
  const aFirst =
    anchor.line < head.line ||
    (anchor.line === head.line && anchor.ch <= head.ch)
  return aFirst ? { from: anchor, to: head } : { from: head, to: anchor }
}

/**
 * Frontmatter property write logic. Pure so we can test the array-promotion
 * rule without having to spin up an Obsidian app.
 *
 * Rules:
 *   - existing is a list  → append
 *   - existing is missing/null/empty string → set to scalar `link`
 *   - existing is any other scalar → promote to `[existing, link]`
 */
export function applyLinkToProperty(
  fm: Record<string, unknown>,
  name: string,
  link: string
): void {
  const existing = fm[name]
  if (Array.isArray(existing)) {
    existing.push(link)
    return
  }
  if (existing === undefined || existing === null || existing === '') {
    fm[name] = link
    return
  }
  fm[name] = [existing, link]
}
