/* eslint-disable no-console */
import process from 'node:process'
import { afterEach, describe, expect, test } from 'bun:test'

type ConsoleFn = (...args: unknown[]) => void

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
}

const originalDebugFlag = process.env.BUN_TEST_UI_DEBUG

afterEach(() => {
  console.log = originalConsole.log
  console.warn = originalConsole.warn
  console.error = originalConsole.error

  if (originalDebugFlag === undefined)
    delete process.env.BUN_TEST_UI_DEBUG
  else
    process.env.BUN_TEST_UI_DEBUG = originalDebugFlag
})

async function importFreshLogModule() {
  return await import(`../../../src/server/utils/log.ts?cache=${Date.now()}-${Math.random()}`)
}

describe('server log helpers', () => {
  test('routes info/warn/error to console methods', async () => {
    process.env.BUN_TEST_UI_DEBUG = '0'

    const calls: Array<{ level: string, args: unknown[] }> = []
    console.log = ((...args: unknown[]) => calls.push({ level: 'log', args })) as ConsoleFn
    console.warn = ((...args: unknown[]) => calls.push({ level: 'warn', args })) as ConsoleFn
    console.error = ((...args: unknown[]) => calls.push({ level: 'error', args })) as ConsoleFn

    const { log } = await importFreshLogModule()
    log.info('hello')
    log.warn('careful')
    log.error('oops')

    expect(calls.map(call => call.level)).toEqual(['log', 'warn', 'error'])
    expect(calls[0]?.args).toEqual(['hello'])
    expect(calls[1]?.args).toEqual(['careful'])
    expect(calls[2]?.args).toEqual(['oops'])
  })

  test('prints debug logs only when debug mode is enabled', async () => {
    const calls: unknown[][] = []
    console.log = ((...args: unknown[]) => calls.push(args)) as ConsoleFn

    process.env.BUN_TEST_UI_DEBUG = '0'
    let module = await importFreshLogModule()
    module.log.debug('hidden')

    process.env.BUN_TEST_UI_DEBUG = '1'
    module = await importFreshLogModule()
    module.log.debug('visible')

    expect(calls.some(args => args.includes('hidden'))).toBe(false)
    expect(calls.some(args => args.includes('visible'))).toBe(true)
    expect(calls.some(args => args[0] === '[debug]')).toBe(true)
  })
})
