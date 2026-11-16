import { describe, expect, it } from 'vitest'
import { setLanguage } from './obsidian-stub'
import { t, translate } from '../i18n'

describe('i18n', () => {
  it('keeps English identity for every key', () => {
    expect(translate('en', 'Cancel')).toBe('Cancel')
    expect(translate('en-US', 'Cancel')).toBe('Cancel')
  })

  it('uses Chinese only for the zh locale', () => {
    for (const locale of ['zh', 'zh_CN', 'zh-Hans']) {
      expect(translate(locale, 'Create note')).toBe('创建笔记')
    }
    expect(translate('zh-TW', 'Create note')).toBe('创建笔记')
  })

  it('falls back to English for unsupported locales and unknown keys', () => {
    expect(translate('fr', 'Create note')).toBe('Create note')
    expect(translate('zh-CN', 'Unknown UI copy')).toBe('Unknown UI copy')
  })

  it('uses the current Obsidian language at call time', () => {
    setLanguage('en')
    expect(t('Create note')).toBe('Create note')
    setLanguage('zh-CN')
    expect(t('Create note')).toBe('创建笔记')
    expect(
      t(
        '{count} files need to be indexed. Obsidian may experience stutters and freezes during the process',
        { count: 1200 }
      )
    ).toBe('1200 个文件需要建立索引。在此过程中 Obsidian 可能会出现卡顿')
    setLanguage('en')
  })
})
