import { describe, expect, test } from 'bun:test'
import { formatDuration } from '../../../src/client/components/utils'
import {
  buildTestNamePattern,
  coerceElapsed,
  escapeTestName,
  normalizeFilePath,
} from '../../../src/client/utils/run'

describe('normalizeFilePath', () => {
  test('normalizes file urls and windows paths', () => {
    expect(normalizeFilePath('file:///C:/repo/src/example.ts')).toBe('C:/repo/src/example.ts')
    expect(normalizeFilePath('C:\\repo\\src\\example.ts')).toBe('C:/repo/src/example.ts')
  })

  test('returns undefined for empty values', () => {
    expect(normalizeFilePath()).toBeUndefined()
    expect(normalizeFilePath('')).toBeUndefined()
  })

  test('returns original value when file url decoding fails', () => {
    const invalid = 'file:///%E0%A4%A'
    expect(normalizeFilePath(invalid)).toBe(invalid)
  })
})

describe('escapeTestName', () => {
  test('escapes regex characters but keeps spaces', () => {
    expect(escapeTestName('suite (user) [1]')).toBe('suite \\(user\\) \\[1\\]')
  })
})

describe('coerceElapsed', () => {
  test('converts inspector nanoseconds to milliseconds', () => {
    expect(coerceElapsed(1_000_000)).toBe(1)
    expect(coerceElapsed('2500000')).toBe(2.5)
    expect(coerceElapsed(3_000_000n)).toBe(3)
  })

  test('handles invalid and non-positive values', () => {
    expect(coerceElapsed(-100)).toBe(0)
    expect(coerceElapsed(0)).toBe(0)
    expect(coerceElapsed(Number.POSITIVE_INFINITY)).toBeUndefined()
    expect(coerceElapsed('not-a-number')).toBeUndefined()
    expect(coerceElapsed(undefined)).toBeUndefined()
  })
})

describe('buildTestNamePattern', () => {
  test('returns undefined when no paths are provided', () => {
    expect(buildTestNamePattern([])).toBeUndefined()
  })

  test('replaces dynamic placeholders with wildcard regex', () => {
    const placeholder = '$' + '{id}'
    const pattern = buildTestNamePattern([['suite', `handles ${placeholder}`, 'value %i']])

    expect(pattern).toBeDefined()
    expect(pattern).toContain('suite handles')
    expect(pattern).toContain('.*?')
  })

  test('builds grouped alternatives for multiple test paths', () => {
    const pattern = buildTestNamePattern([
      ['auth', 'logs in'],
      ['auth', 'logs out'],
    ])

    expect(pattern).toContain('|')
    expect(pattern).toContain('(auth logs in)')
    expect(pattern).toContain('(auth logs out)')
  })
})

describe('formatDuration', () => {
  test('formats milliseconds and seconds consistently', () => {
    expect(formatDuration(undefined)).toBe('—')
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(0.4)).toBe('<1ms')
    expect(formatDuration(27)).toBe('27ms')
    expect(formatDuration(1500)).toBe('1.50s')
  })
})
