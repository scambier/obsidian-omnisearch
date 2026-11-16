import { afterEach, describe, expect, it, vi } from 'vitest'
import type OmnisearchPlugin from '../main'
import { setLanguage } from './obsidian-stub'
import { getServer } from '../tools/api-server'

const mocks = vi.hoisted(() => ({
  listen: vi.fn((_options, callback: () => void) => callback()),
  on: vi.fn<(event: string, handler: (error: Error) => void) => void>(),
  close: vi.fn(),
  notice: vi.fn(),
}))

vi.mock('http', () => ({
  createServer: () => mocks,
}))
vi.mock('obsidian', async importOriginal => ({
  ...(await importOriginal<object>()),
  Notice: mocks.notice,
}))
vi.mock('../tools/api', () => ({ getApi: () => ({}) }))
vi.mock('../tools/utils', () => ({ logVerbose: vi.fn() }))

afterEach(() => {
  setLanguage('en')
  vi.restoreAllMocks()
})

describe('HTTP server notices', () => {
  it.each([
    ['en', 'Started non-localhost HTTP server at 0.0.0.0:51361'],
    ['zh-CN', '已在 0.0.0.0:51361 启动非 localhost HTTP 服务器'],
  ])(
    'localizes startup without changing the listening address (%s)',
    (language, message) => {
      setLanguage(language)
      vi.spyOn(console, 'debug').mockImplementation(() => {})
      vi.spyOn(console, 'log').mockImplementation(() => {})
      const plugin = {
        settings: { DANGER_httpHost: '0.0.0.0', httpApiNotice: false },
      } as OmnisearchPlugin

      getServer(plugin).listen('51361')

      expect(mocks.listen).toHaveBeenCalledWith(
        { port: 51361, host: '0.0.0.0' },
        expect.any(Function)
      )
      expect(mocks.notice).toHaveBeenCalledWith(
        `Omnisearch - ${message}`,
        120_000
      )
    }
  )

  it.each([
    ['en', 'Cannot start HTTP server on 51361. See console for more details.'],
    ['zh-CN', '无法在端口 51361 启动 HTTP 服务器。详情请查看控制台。'],
  ])(
    'localizes startup failures and keeps the original error (%s)',
    (language, message) => {
      setLanguage(language)
      vi.spyOn(console, 'debug').mockImplementation(() => {})
      vi.spyOn(console, 'log').mockImplementation(() => {})
      const logError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const plugin = { settings: {} } as OmnisearchPlugin
      getServer(plugin).listen('51361')
      const error = new Error(
        'listen EADDRINUSE: address already in use ::1:51361'
      )
      const handler = mocks.on.mock.calls.find(
        ([event]) => event === 'error'
      )?.[1]

      expect(handler).toBeTypeOf('function')
      handler?.(error)

      expect(mocks.listen).toHaveBeenCalledWith(
        { port: 51361, host: 'localhost' },
        expect.any(Function)
      )
      expect(mocks.notice).toHaveBeenCalledWith(`Omnisearch - ${message}`)
      expect(logError).toHaveBeenCalledWith(error)
    }
  )
})
