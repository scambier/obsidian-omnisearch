import { describe, expect, it } from 'vitest'
import {
  BRACKETS_AND_SPACE,
  SEPARATORS,
  SPACE_OR_PUNCTUATION,
} from '../globals'

/** Mirrors how `Tokenizer` consumes `BRACKETS_AND_SPACE`. */
function splitWords(text: string): string[] {
  return text.split(BRACKETS_AND_SPACE).filter(Boolean)
}

/** Mirrors how `Tokenizer` consumes `SPACE_OR_PUNCTUATION`. */
function splitTokens(text: string): string[] {
  return text.split(SPACE_OR_PUNCTUATION).filter(Boolean)
}

const BRACKET_CHARS = ['|', '[', ']', '(', ')', '<', '>', '{', '}']
const ASCII_WHITESPACE = [' ', '\t', '\n', '\r']

describe('Search tokenization regexes', () => {
  describe('BRACKETS_AND_SPACE', () => {
    it('should match every bracket, pipe and ASCII whitespace', () => {
      for (const char of [...BRACKET_CHARS, ...ASCII_WHITESPACE]) {
        expect(
          BRACKETS_AND_SPACE.test(char),
          `${JSON.stringify(char)} should be a separator`
        ).toBe(true)
      }
    })

    it('should not match letters, digits, diacritics or in-word punctuation', () => {
      for (const char of ['a', 'Z', '0', 'é', '-', '/', ':', '_', '.', "'", '\\']) {
        expect(
          BRACKETS_AND_SPACE.test(char),
          `${JSON.stringify(char)} should not be a separator`
        ).toBe(false)
      }
    })

    it('should split a word from its surrounding brackets', () => {
      expect(splitWords('foo(bar)')).toEqual(['foo', 'bar'])
      expect(splitWords('[note]')).toEqual(['note'])
      expect(splitWords('{qux}')).toEqual(['qux'])
      expect(splitWords('<a>')).toEqual(['a'])
    })

    it('should split on the closing bracket', () => {
      // Regression test: `]` must stay escaped in the character class,
      // otherwise it closes the class early.
      expect(splitWords('a]b')).toEqual(['a', 'b'])
      expect(splitWords('a]b[c')).toEqual(['a', 'b', 'c'])
    })

    it('should split on the pipe used by Obsidian as an OR operator', () => {
      expect(splitWords('foo|bar')).toEqual(['foo', 'bar'])
    })

    it('should split on spaces, tabs, newlines and carriage returns', () => {
      expect(splitWords('foo bar')).toEqual(['foo', 'bar'])
      expect(splitWords('foo\tbar\nbaz\rqux')).toEqual([
        'foo',
        'bar',
        'baz',
        'qux',
      ])
    })

    it('should preserve punctuation that can be part of a word', () => {
      // This is what distinguishes the "words" query group from the "tokens" one
      expect(splitWords('well-known a/b mot:fin snake_case v1.2')).toEqual([
        'well-known',
        'a/b',
        'mot:fin',
        'snake_case',
        'v1.2',
      ])
    })

    it('should keep empty strings between consecutive separators', () => {
      // Callers filter them out (see Tokenizer.tokenizeForIndexing/ForSearch),
      // but the raw behaviour is documented here.
      const tokens = '[[note]]'.split(BRACKETS_AND_SPACE)
      expect(tokens).toEqual(['', '', 'note', '', ''])
      expect(tokens.filter(Boolean)).toEqual(['note'])
    })

    // Known limitation: only ASCII whitespace is matched. Once the whitespace
    // list is replaced by `\s`, this test must be flipped from `it.fails` to `it`.
    it.fails('should split on non-breaking and other Unicode spaces', () => {
      expect(splitWords('mot\u00A0:fin')).toEqual(['mot', ':fin'])
      expect(splitWords('foo\u2009bar\u3000baz')).toEqual([
        'foo',
        'bar',
        'baz',
      ])
    })
  })

  describe('SPACE_OR_PUNCTUATION', () => {
    it('should be a valid class source reusable as-is', () => {
      expect(SEPARATORS).not.toBe('')
      expect(() => new RegExp(SEPARATORS, 'u')).not.toThrow()
    })

    it('should split on ASCII spaces and punctuation', () => {
      expect(splitTokens('foo bar, baz')).toEqual(['foo', 'bar', 'baz'])
      expect(splitTokens('foo:bar;baz')).toEqual(['foo', 'bar', 'baz'])
      expect(splitTokens('a/b')).toEqual(['a', 'b'])
    })

    it('should collapse consecutive separators', () => {
      expect('foo   ,,,   bar'.split(SPACE_OR_PUNCTUATION)).toEqual([
        'foo',
        'bar',
      ])
      expect('  foo  '.split(SPACE_OR_PUNCTUATION)).toEqual(['', 'foo', ''])
    })

    it('should not split on hyphens', () => {
      // `-` is Obsidian's exclusion operator, and is part of hyphenated words
      expect(splitTokens('well-known')).toEqual(['well-known'])
      expect(splitTokens('foo -bar')).toEqual(['foo', '-bar'])
    })

    it('should split on Unicode spaces, including non-breaking ones', () => {
      expect(splitTokens('mot\u00A0:fin')).toEqual(['mot', 'fin'])
      expect(splitTokens('foo\u2009bar\u3000baz')).toEqual([
        'foo',
        'bar',
        'baz',
      ])
    })

    it('should split on typographic punctuation', () => {
      expect(splitTokens('« citation »')).toEqual(['citation'])
      expect(splitTokens('foo—bar')).toEqual(['foo', 'bar'])
      expect(splitTokens('foo…bar')).toEqual(['foo', 'bar'])
    })

    it('should keep letters with diacritics and emoji intact', () => {
      expect(splitTokens('crème brûlée')).toEqual(['crème', 'brûlée'])
      expect(splitTokens('🦀')).toEqual(['🦀'])
    })

    it('should match every character already handled by BRACKETS_AND_SPACE', () => {
      // Consistency check: the "words" separators must be a subset of the
      // "tokens" separators.
      for (const char of [...BRACKET_CHARS, ...ASCII_WHITESPACE]) {
        expect(
          SPACE_OR_PUNCTUATION.test(char),
          `${JSON.stringify(char)} should be a token separator`
        ).toBe(true)
      }
    })
  })
})
