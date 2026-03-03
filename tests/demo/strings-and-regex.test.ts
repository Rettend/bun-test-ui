import { describe, expect, test } from 'bun:test'

function dedent(input: string) {
  const lines = input.trim().split('\n')
  const indents = lines
    .filter(Boolean)
    .map(line => (line.match(/^(\s*)/)?.[1] ?? '').length)
  const minIndent = indents.length ? Math.min(...indents) : 0

  return lines.map(line => line.slice(minIndent)).join('\n')
}

describe('strings and regex', () => {
  test('template literal interpolation', () => {
    const name = 'Inspector'
    const summary = `${name} UI is live`
    expect(summary).toContain('Inspector')
    expect(summary.endsWith('live')).toBe(true)
  })

  test('regex captures multiple groups', () => {
    const log = '[INFO] connected port=3000 session=dev'
    const match = /\[([A-Z]+)\] connected port=(\d+) session=(\w+)/.exec(log)
    expect(match?.slice(1)).toEqual(['INFO', '3000', 'dev'])
  })

  test('dedent trims common whitespace', () => {
    const text = dedent(`
      line one
        line two
      line three
    `)

    expect(text.startsWith('line one')).toBe(true)
    expect(text.includes('\nline two')).toBe(true)
  })

  test('unicode safe length count', () => {
    const value = '⚡️inspector'
    expect([...value].length).toBe(11)
  })

  test('deliberate regex failure to visualize diff', () => {
    expect('bun-test-ui').toMatch(/vitest/)
  })
})
