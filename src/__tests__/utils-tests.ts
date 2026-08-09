import { describe, expect, it } from 'vitest'
import type { CachedMetadata } from 'obsidian'
import { getAliasesFromMetadata, removeBase64Images } from '../tools/utils'

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
      } as unknown as CachedMetadata
      // Act
      const actual = getAliasesFromMetadata(metadata)
      // Assert
      expect(actual).toEqual(['foo', 'bar'])
    })
    it('should convert the aliases string into an array', () => {
      // Arrange
      const metadata = {
        frontmatter: { aliases: 'foo, bar' },
      } as unknown as CachedMetadata
      // Act
      const actual = getAliasesFromMetadata(metadata)
      // Assert
      expect(actual).toEqual(['foo', 'bar'])
    })
    it('should return an empty array if the aliases field is an empty string', () => {
      // Arrange
      const metadata = {
        frontmatter: { aliases: '' },
      } as unknown as CachedMetadata
      // Act
      const actual = getAliasesFromMetadata(metadata)
      // Assert
      expect(actual).toEqual([])
    })
  })

  describe('removeBase64Images', () => {
    it('should remove an inlined base64 image from markdown', () => {
      // Arrange
      const text =
        'Before ![alt](data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==) after'
      // Act
      const actual = removeBase64Images(text)
      // Assert
      expect(actual).toBe('Before ![alt]() after')
    })
    it('should remove a base64 image without alt text', () => {
      // Arrange
      const text = '![](data:image/png;base64,iVBORw0KGgo)'
      // Act
      const actual = removeBase64Images(text)
      // Assert
      expect(actual).toBe('![]()')
    })
    it('should remove any base64 data URI, whatever its mediatype', () => {
      // Arrange
      const text =
        'data:application/pdf;base64,JVBERi0xLjQK|data:text/html;base64,PHN2Zy8+'
      // Act
      const actual = removeBase64Images(text)
      // Assert
      expect(actual).toBe('|')
    })
    it('should not remove text after the base64 payload', () => {
      // Arrange
      const text = 'A data:image/png;base64,iVBORw0KGgo is a nice day'
      // Act
      const actual = removeBase64Images(text)
      // Assert
      expect(actual).toBe('A  is a nice day')
    })
    it('should remove base64url-encoded payloads', () => {
      // Arrange
      const text = 'A data:image/png;base64,iVBOR-w0KG_goAAAANSUhEUg after'
      // Act
      const actual = removeBase64Images(text)
      // Assert
      expect(actual).toBe('A  after')
    })
    it('should keep text that is not a base64 data URI', () => {
      // Arrange
      const text = 'The data: field and image/png;base64 discussion'
      // Act
      const actual = removeBase64Images(text)
      // Assert
      expect(actual).toBe(text)
    })
  })
})
