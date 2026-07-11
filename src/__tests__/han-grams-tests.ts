import {
  HAN_GRAM_PREFIX,
  createIndexSignature,
  createHanQueryPlan,
  documentContainsHanRuns,
  extractHanRuns,
  isHanIndexCharacter,
  markHanGram,
  reconcileVerifiedHanResults,
  requiresHanVerification,
  tokenizeHanBigrams,
} from '../search/han-grams'

describe('Han gram fallback helpers', () => {
  it('recognizes Han letters without accepting punctuation or other scripts', () => {
    expect(isHanIndexCharacter('中')).toBe(true)
    expect(isHanIndexCharacter('𠀀')).toBe(true)
    expect(isHanIndexCharacter('々')).toBe(true)
    expect(isHanIndexCharacter('〇')).toBe(true)
    expect(isHanIndexCharacter('。')).toBe(false)
    expect(isHanIndexCharacter('あ')).toBe(false)
    expect(isHanIndexCharacter('한')).toBe(false)
  })

  it('extracts Han runs across mixed text and punctuation', () => {
    expect(extractHanRuns('机器学习with TypeScript中文。搜索')).toEqual([
      '机器学习',
      '中文',
      '搜索',
    ])
  })

  it('creates overlapping bigrams by Unicode code point', () => {
    expect(tokenizeHanBigrams('周五的时候')).toEqual([
      '周五',
      '五的',
      '的时',
      '时候',
    ])
    expect(tokenizeHanBigrams('𠀀野家')).toEqual(['𠀀野', '野家'])
    expect(tokenizeHanBigrams('二〇二六')).toEqual(['二〇', '〇二', '二六'])
  })

  it('does not cross punctuation and preserves real repeated occurrences', () => {
    expect(tokenizeHanBigrams('中文。搜索')).toEqual(['中文', '搜索'])
    expect(tokenizeHanBigrams('哈哈哈')).toEqual(['哈哈', '哈哈'])
    expect(tokenizeHanBigrams('中')).toEqual([])
  })

  it('builds a deduplicated query plan while preserving separated constraints', () => {
    const mixedPlan = createHanQueryPlan('projectA 时候 时候')
    expect(mixedPlan?.runs).toEqual(['时候', '时候'])
    expect(mixedPlan?.grams).toEqual([markHanGram('时候')])
    expect(mixedPlan?.remainingText.trim()).toBe('projectA')

    const singleCharacterPlan = createHanQueryPlan('中 时候')
    expect(singleCharacterPlan?.runs).toEqual(['时候'])
    expect(singleCharacterPlan?.grams).toEqual([markHanGram('时候')])
    expect(singleCharacterPlan?.remainingText.trim()).toBe('中')

    const fullwidthPlan = createHanQueryPlan('Ｐroject 时候')
    expect(fullwidthPlan?.remainingText.trim()).toBe('Ｐroject')
  })

  it('keeps attached mixed-script tokens on the legacy path in v1', () => {
    expect(createHanQueryPlan('时候bar')).toBeNull()
    expect(createHanQueryPlan('foo时候')).toBeNull()

    const partialPlan = createHanQueryPlan('时候 foo中文bar')
    expect(partialPlan?.runs).toEqual(['时候'])
    expect(partialPlan?.remainingText.trim()).toBe('foo中文bar')
  })

  it('verifies every run within an individual original field', () => {
    expect(documentContainsHanRuns(['甲乙丙'], ['前甲乙丙后', '其他'])).toBe(
      true
    )
    expect(documentContainsHanRuns(['甲乙丙'], ['甲乙', '乙丙'])).toBe(false)
    expect(
      documentContainsHanRuns(['甲乙', '丁戊'], ['前甲乙后', '前丁戊后'])
    ).toBe(true)
  })

  it('requires raw verification only for runs longer than one bigram', () => {
    expect(requiresHanVerification(['时候'])).toBe(false)
    expect(requiresHanVerification(['甲乙丙'])).toBe(true)
  })

  it('changes the cache signature when index-affecting inputs change', () => {
    const base = {
      tokenizeUrls: true,
      ignoreDiacritics: true,
      ignoreArabicDiacritics: false,
      chsPatch: 'absent' as const,
    }
    const signature = createIndexSignature(base)
    expect(signature).toBe(createIndexSignature(base))
    expect(JSON.parse(signature)).toEqual(
      expect.objectContaining({ gramMarker: HAN_GRAM_PREFIX })
    )
    expect(createIndexSignature(base)).not.toBe(
      createIndexSignature({ ...base, chsPatch: '1.2.3' })
    )
    expect(createIndexSignature(base)).not.toBe(
      createIndexSignature({ ...base, tokenizeUrls: false })
    )
  })

  it('uses natural scores when an unverified fallback also matched', () => {
    const natural = [{ id: 'natural', score: 2 }]
    const combined = [
      { id: 'false-fallback', score: 10 },
      { id: 'natural', score: 8 },
      { id: 'verified', score: 3 },
    ]
    expect(
      reconcileVerifiedHanResults(natural, combined, new Set(['verified']))
    ).toEqual([
      { id: 'verified', score: 3 },
      { id: 'natural', score: 2 },
    ])
  })
})
