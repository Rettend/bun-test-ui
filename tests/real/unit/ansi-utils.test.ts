import { describe, expect, test } from 'bun:test'
import { ansiToHtml, stripAnsi } from '../../../src/client/utils/ansi'

describe('stripAnsi', () => {
  test('removes standard ANSI color codes', () => {
    expect(stripAnsi('\u001B[31merror\u001B[0m')).toBe('error')
  })

  test('leaves plain text unchanged', () => {
    expect(stripAnsi('plain output')).toBe('plain output')
  })
})

describe('ansiToHtml', () => {
  test('converts ansi colors into html spans', () => {
    const html = ansiToHtml('\u001B[32mok\u001B[0m')
    expect(html).toContain('ansi-green-fg')
    expect(html).toContain('ok')
  })
})
