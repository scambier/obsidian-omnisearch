import { describe, expect, it } from 'vitest'
import type { CachedMetadata } from 'obsidian'
import {
  getAliasesFromMetadata,
  getFrontmatterEndOffset,
  normalizeExactMatchContent,
  removeBase64Images,
} from '../tools/utils'

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

  describe('normalizeExactMatchContent', () => {
    it('matches the normalized content formerly retained by each document', () => {
      expect(normalizeExactMatchContent('A *Crème* _brûlée_')).toBe(
        'a creme brulee'
      )
    })
  })

  describe('getFrontmatterEndOffset', () => {
    it('returns 0 when there is no frontmatter', () => {
      expect(getFrontmatterEndOffset('# Title\nbody')).toBe(0)
      expect(getFrontmatterEndOffset('')).toBe(0)
    })
    it('returns 0 when the opening fence is not on the first line', () => {
      expect(getFrontmatterEndOffset('\n---\na: 1\n---\nbody')).toBe(0)
    })
    it('returns the offset of the first body character', () => {
      const fm = '---\nsource: "[[Folder/Note.pdf]]"\ntitle: Note\n---\n'
      expect(getFrontmatterEndOffset(fm + 'body text')).toBe(fm.length)
    })
    it('handles CRLF line endings', () => {
      const fm = '---\r\na: 1\r\n---\r\n'
      expect(getFrontmatterEndOffset(fm + 'body')).toBe(fm.length)
    })
    it('treats an unterminated fence as no frontmatter', () => {
      expect(getFrontmatterEndOffset('---\na: 1\nbody')).toBe(0)
    })
    it('accepts an empty frontmatter block', () => {
      expect(getFrontmatterEndOffset('---\n---\nbody')).toBe(8)
    })
    it('handles a file that is only frontmatter', () => {
      const fm = '---\na: 1\n---'
      expect(getFrontmatterEndOffset(fm)).toBe(fm.length)
    })
  })
})
