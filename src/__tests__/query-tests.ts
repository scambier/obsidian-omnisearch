import { Query } from '../search/query'

describe('The Query class', () => {
  const stringQuery =
    "foo bar 'lorem ipsum' -baz dolor \"sit amet\"  -'quoted exclusion'"

  it('should correctly parse string queries', () => {
    // Act
    const query = new Query(stringQuery)

    // Assert
    const segments = query.query.text
    expect(segments).toHaveLength(5)
    expect(segments).toContain('foo')
    expect(segments).toContain('bar')
    expect(segments).toContain('lorem ipsum')
    expect(segments).toContain('dolor')
    expect(segments).toContain('sit amet')

    const exclusions = query.query.exclude.text
    expect(exclusions).toHaveLength(2)
    expect(exclusions).toContain('baz')
    expect(exclusions).toContain('quoted exclusion')
  })

  it('should not exclude words when there is no space before', () => {
    // Act
    const query = new Query('foo bar-baz')

    // Assert
    expect(query.query.exclude.text).toHaveLength(0)
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
