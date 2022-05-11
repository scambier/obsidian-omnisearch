import type { CachedMetadata } from 'obsidian'
import { getAliasesFromMetadata } from '../utils'

describe('Utils', () => {
  describe('getAliasesFromMetadata', () => {
    it('should return an empty string if no metadata is provided', () => {
      // Act
      const actual = getAliasesFromMetadata(null)
      // Assert
      expect(actual).toBe('')
    })
    it('should return an empty string if no aliases are provided', () => {
      // Arrange
      const metadata = {} as CachedMetadata
      // Act
      const actual = getAliasesFromMetadata(metadata)
      // Assert
      expect(actual).toBe('')
    })
    it('should join aliases with a comma', () => {
      // Arrange
      const metadata = {
        frontmatter: { aliases: ['foo', 'bar'] },
      } as CachedMetadata
      // Act
      const actual = getAliasesFromMetadata(metadata)
      // Assert
      expect(actual).toBe('foo, bar')
    })
    it('should return a single alias if only one is provided', () => {
      // Arrange
      const metadata = {
        frontmatter: { aliases: 'foo, bar' },
      } as CachedMetadata
      // Act
      const actual = getAliasesFromMetadata(metadata)
      // Assert
      expect(actual).toBe('foo, bar')
    })
  })
})
