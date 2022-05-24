import { Query } from '../query'

describe('The Query class', () => {
  const stringQuery =
    "foo bar 'lorem ipsum' -baz dolor \"sit amet\"  -'quoted exclusion'"

  it('should correctly parse string queries', () => {
    // Act
    const query = new Query(stringQuery)

    // Assert
    const segments = query.segments.map(s => s.value)
    expect(segments).toHaveLength(5)
    expect(segments).toContain('foo')
    expect(segments).toContain('bar')
    expect(segments).toContain('lorem ipsum')
    expect(segments).toContain('dolor')
    expect(segments).toContain('sit amet')

    const exclusions = query.exclusions.map(s => s.value)
    expect(exclusions).toHaveLength(2)
    expect(exclusions).toContain('baz')
    expect(exclusions).toContain('quoted exclusion')
  })

  it('should mark quoted segments & exclusions as "exact"', () => {
    // Act
    const query = new Query(stringQuery)

    // Assert
    expect(query.segments.filter(s => s.exact)).toHaveLength(2)
    expect(
      query.segments.find(o => o.value === 'lorem ipsum')!.exact,
    ).toBeTruthy()
    expect(query.segments.find(o => o.value === 'sit amet')!.exact).toBeTruthy()

    expect(query.exclusions.filter(s => s.exact)).toHaveLength(1)
    expect(
      query.exclusions.find(o => o.value === 'quoted exclusion')!.exact,
    ).toBeTruthy()
  })

  it('should not exclude words when there is no space before', () => {
    // Act
    const query = new Query('foo bar-baz')

    // Assert
    expect(query.exclusions).toHaveLength(0)
  })

  describe('.getExactTerms()', () => {
    it('should an array of strings containg "exact" values', () => {
      // Act
      const query = new Query(stringQuery)

      // Assert
      expect(query.getExactTerms()).toEqual(['lorem ipsum', 'sit amet'])
    })
  })
})
