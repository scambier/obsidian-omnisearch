import {
  isProximityQuery,
  parseProximityQuery,
  patternToRegex,
  tokenizeHebrew,
  proximitySearchText,
  proximityMatchesToSearchMatches,
  extractRootTerms,
} from '../search/proximity-search'

const TEST_TEXT =
  'יש צורך בתיקון השלמות של העולם מאד רבות הן הדרכים אך התיקונים בשלמות מאד חשובים לנו כולנו כי תקון עולם הוא שלמה של הנשמה מאד עמוק'

describe('Proximity search', () => {
  describe('isProximityQuery', () => {
    it('returns true for @N(...) and @(...) queries', () => {
      expect(isProximityQuery('@10(ת*קן +ש+למ+ מאד)')).toBe(true)
      expect(isProximityQuery('  @5(+תקן+)  ')).toBe(true)
      expect(isProximityQuery('@10(תקון)')).toBe(true)
      expect(isProximityQuery('@(תקון)')).toBe(true)
    })
    it('returns true for RTL-typed form )N(pattern@', () => {
      expect(isProximityQuery(')10(תקון@')).toBe(true)
    })
    it('returns false for normal queries', () => {
      expect(isProximityQuery('foo bar')).toBe(false)
      expect(isProximityQuery('תקן')).toBe(false)
      expect(isProximityQuery('@')).toBe(false)
    })
  })

  describe('parseProximityQuery', () => {
    it('parses distance and space-separated patterns', () => {
      const q = parseProximityQuery('@10(ת*קן +ש+למ+ מאד)')
      expect(q.distance).toBe(10)
      expect(q.patterns).toEqual(['ת*קן', '+ש+למ+', 'מאד'])
      expect(q.regexes).toHaveLength(3)
    })
    it('parses RTL form )N(pattern@ as @N(pattern)', () => {
      const q = parseProximityQuery(')10(תקון@')
      expect(q.distance).toBe(10)
      expect(q.patterns).toEqual(['תקון'])
      expect(q.regexes).toHaveLength(1)
    })
    it('parses @(pattern) with default distance 10', () => {
      const q = parseProximityQuery('@(תקון)')
      expect(q.distance).toBe(10)
      expect(q.patterns).toEqual(['תקון'])
    })
  })

  describe('patternToRegex', () => {
    it('compiles * to any Hebrew letter', () => {
      const re = patternToRegex('ת*קן')
      expect(re.test('תקן')).toBe(true)
      expect(re.test('תיקון')).toBe(true)
      expect(re.test('תקון')).toBe(true)
    })
    it('compiles + to prefix/suffix set only', () => {
      const re = patternToRegex('+שלמ+')
      expect(re.test('השלמות')).toBe(true)
      expect(re.test('בשלמות')).toBe(true)
      expect(re.test('שלמה')).toBe(true)
    })
    it('final-form מ/ם interchangeable', () => {
      const re = patternToRegex('מאד')
      expect(re.test('מאד')).toBe(true)
      expect(re.test('םאד')).toBe(true)
    })
    it('final-form נ/ן interchangeable', () => {
      const re = patternToRegex('תקן')
      expect(re.test('תקן')).toBe(true)
      expect(re.test('תקנ')).toBe(true)
    })
  })

  describe('tokenizeHebrew', () => {
    it('splits on Hebrew sequences and strips nikud', () => {
      const tokens = tokenizeHebrew(TEST_TEXT)
      expect(tokens.length).toBeGreaterThan(20)
      expect(tokens[0].word).toBe('יש')
      expect(tokens[0].normalized).toBe('יש')
      const בתיקון = tokens.find(t => t.word.includes('תיקון'))
      expect(בתיקון).toBeDefined()
      expect(בתיקון!.wordIndex).toBe(2)
    })
  })

  describe('proximitySearchText', () => {
    it('finds proximity groups for @10(+ת*ק*ן+ +ש+למ+ מאד)', () => {
      const query = parseProximityQuery('@10(+ת*ק*ן+ +ש+למ+ מאד)')
      const matches = proximitySearchText(TEST_TEXT, query)
      expect(matches.length).toBeGreaterThanOrEqual(1)
      const words = matches.flatMap(m => m.words.map(w => w.word))
      expect(words).toContain('בתיקון')
      expect(words).toContain('השלמות')
      expect(words).toContain('מאד')
    })
    it('single pattern returns one match per matching word', () => {
      const query = parseProximityQuery('@5(+ת*ק*ן+)')
      const matches = proximitySearchText(TEST_TEXT, query)
      expect(matches.length).toBeGreaterThanOrEqual(3)
      const matchedWords = matches.map(m => m.words[0].word)
      expect(matchedWords).toContain('בתיקון')
      expect(matchedWords).toContain('התיקונים')
      expect(matchedWords).toContain('תקון')
    })
  })

  describe('proximityMatchesToSearchMatches', () => {
    it('converts to SearchMatch with match and offset', () => {
      const query = parseProximityQuery('@10(מאד)')
      const matches = proximitySearchText(TEST_TEXT, query)
      const searchMatches = proximityMatchesToSearchMatches(matches)
      expect(searchMatches.every(m => 'match' in m && 'offset' in m)).toBe(true)
      expect(searchMatches.some(m => m.match === 'מאד')).toBe(true)
    })
  })

  describe('extractRootTerms', () => {
    it('strips * and + from patterns', () => {
      const terms = extractRootTerms(['+ת*ק*ן+', '+ש+למ+', 'מאד'])
      expect(terms).toContain('תקן')
      expect(terms).toContain('שלמ')
      expect(terms).toContain('מאד')
    })
  })
})
