import { applyLinkToProperty, orderSelection } from '../tools/link-insertion'

describe('orderSelection', () => {
  it('returns the input order when anchor is already before head', () => {
    const r = orderSelection({ line: 0, ch: 5 }, { line: 0, ch: 10 })
    expect(r.from).toEqual({ line: 0, ch: 5 })
    expect(r.to).toEqual({ line: 0, ch: 10 })
  })

  it('swaps when the user dragged backwards on a single line', () => {
    const r = orderSelection({ line: 0, ch: 10 }, { line: 0, ch: 5 })
    expect(r.from).toEqual({ line: 0, ch: 5 })
    expect(r.to).toEqual({ line: 0, ch: 10 })
  })

  it('handles multi-line selections forwards', () => {
    const r = orderSelection({ line: 1, ch: 0 }, { line: 3, ch: 7 })
    expect(r.from).toEqual({ line: 1, ch: 0 })
    expect(r.to).toEqual({ line: 3, ch: 7 })
  })

  it('handles multi-line selections backwards', () => {
    const r = orderSelection({ line: 3, ch: 7 }, { line: 1, ch: 0 })
    expect(r.from).toEqual({ line: 1, ch: 0 })
    expect(r.to).toEqual({ line: 3, ch: 7 })
  })

  it('treats equal positions as zero-width selection (anchor first)', () => {
    const r = orderSelection({ line: 2, ch: 4 }, { line: 2, ch: 4 })
    expect(r.from).toEqual({ line: 2, ch: 4 })
    expect(r.to).toEqual({ line: 2, ch: 4 })
  })
})

describe('applyLinkToProperty', () => {
  const LINK = '[[Alpha]]'

  it('sets the value when the property is missing', () => {
    const fm: Record<string, unknown> = {}
    applyLinkToProperty(fm, 'references', LINK)
    expect(fm.references).toBe(LINK)
  })

  it('sets the value when the existing value is null', () => {
    const fm: Record<string, unknown> = { references: null }
    applyLinkToProperty(fm, 'references', LINK)
    expect(fm.references).toBe(LINK)
  })

  it('sets the value when the existing value is an empty string', () => {
    const fm: Record<string, unknown> = { references: '' }
    applyLinkToProperty(fm, 'references', LINK)
    expect(fm.references).toBe(LINK)
  })

  it('appends to an existing list (in-place mutation, no replacement)', () => {
    const list: unknown[] = ['[[Beta]]']
    const fm: Record<string, unknown> = { references: list }
    applyLinkToProperty(fm, 'references', LINK)
    expect(fm.references).toBe(list) // same array instance
    expect(fm.references).toEqual(['[[Beta]]', LINK])
  })

  it('promotes a scalar string to a 2-element list to preserve the prior value', () => {
    const fm: Record<string, unknown> = { references: '[[Beta]]' }
    applyLinkToProperty(fm, 'references', LINK)
    expect(fm.references).toEqual(['[[Beta]]', LINK])
  })

  it('promotes a scalar number to a list', () => {
    const fm: Record<string, unknown> = { count: 42 }
    applyLinkToProperty(fm, 'count', LINK)
    expect(fm.count).toEqual([42, LINK])
  })

  it('does not touch unrelated properties', () => {
    const fm: Record<string, unknown> = {
      references: ['[[Beta]]'],
      tags: ['fauna'],
    }
    applyLinkToProperty(fm, 'references', LINK)
    expect(fm.tags).toEqual(['fauna'])
  })
})
