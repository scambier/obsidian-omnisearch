import type { CachedMetadata } from 'obsidian'
import { getAliasesFromMetadata } from '../utils'

describe('Utils', () => {
  describe('getAliasesFromMetadata', () => {
    it('should return an empty array if no metadata is provided', () => {
      // Act
      const actual = getAliasesFromMetadata(null)
      // Assert
      expect(actual).toEqual([])
    })
    it('should return an empty array if no aliases are provided', () => {
      // Act
      const actual = getAliasesFromMetadata({})
      // Assert
      expect(actual).toEqual([])
    })
    it('should return the aliases array as-is', () => {
      // Arrange
      const metadata = {
        frontmatter: { aliases: ['foo', 'bar'] },
      } as CachedMetadata
      // Act
      const actual = getAliasesFromMetadata(metadata)
      // Assert
      expect(actual).toEqual(['foo', 'bar'])
    })
    it('should convert the aliases string into an array', () => {
      // Arrange
      const metadata = {
        frontmatter: { aliases: 'foo, bar' },
      } as CachedMetadata
      // Act
      const actual = getAliasesFromMetadata(metadata)
      // Assert
      expect(actual).toEqual(['foo', 'bar'])
    })
    it('should return an empty array if the aliases field is an empty string', () => {
      // Arrange
      const metadata = {
        frontmatter: { aliases: '' },
      } as CachedMetadata
      // Act
      const actual = getAliasesFromMetadata(metadata)
      // Assert
      expect(actual).toEqual([])
    })
  })
})
