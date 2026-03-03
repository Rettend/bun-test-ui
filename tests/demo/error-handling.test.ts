import { describe, expect, test } from 'bun:test'

describe('error handling and messaging', () => {
  test('invalid json throws syntax error', () => {
    expect(() => JSON.parse('{ oops }')).toThrow(SyntaxError)
  })

  test('custom errors carry context', () => {
    class ContextError extends Error {
      constructor(message: string, readonly meta: Record<string, string>) {
        super(message)
      }
    }

    const err = new ContextError('failed to render', { view: 'sidebar' })
    expect(err.meta.view).toBe('sidebar')
    expect(err).toBeInstanceOf(ContextError)
  })

  test('stack traces include function names', () => {
    function blameLine() {
      throw new Error('boom')
    }

    try {
      blameLine()
    }
    catch (error) {
      const stack = (error as Error).stack ?? ''
      expect(stack.includes('blameLine')).toBe(true)
      expect((error as Error).message).toBe('boom')
    }
  })

  test.todo('map inspector protocol codes to friendly messages', () => {
    // todo: assert error code mappings once implemented
  })
})
