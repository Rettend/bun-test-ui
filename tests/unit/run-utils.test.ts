import { describe, expect, test } from 'bun:test'
import { formatDuration } from '../../src/client/components/utils'
import { buildTestNamePattern, coerceElapsed, normalizeFilePath } from '../../src/client/utils/run'

describe('normalizeFilePath', () => {
  test('normalizes file urls and windows paths', () => {
    expect(normalizeFilePath('file:///C:/repo/src/example.ts')).toBe('C:/repo/src/example.ts')
    expect(normalizeFilePath('C:\\repo\\src\\example.ts')).toBe('C:/repo/src/example.ts')
  })
})

describe('coerceElapsed', () => {
  test('converts inspector nanoseconds to milliseconds', () => {
    expect(coerceElapsed(1_000_000)).toBe(1)
    expect(coerceElapsed('2500000')).toBe(2.5)
  })

  test('handles invalid and non-positive values', () => {
    expect(coerceElapsed(-100)).toBe(0)
    expect(coerceElapsed('not-a-number')).toBeUndefined()
    expect(coerceElapsed(undefined)).toBeUndefined()
  })
})

describe('buildTestNamePattern', () => {
  test('replaces dynamic placeholders with wildcard regex', () => {
    const pattern = buildTestNamePattern([['suite', 'handles ${id}', 'value %i']])

    expect(pattern).toBeDefined()
    expect(pattern).toContain('suite handles')
    expect(pattern).toContain('.*?')
  })
})

describe('formatDuration', () => {
  test('formats milliseconds and seconds consistently', () => {
    expect(formatDuration(undefined)).toBe('—')
    expect(formatDuration(0.4)).toBe('<1ms')
    expect(formatDuration(27)).toBe('27ms')
    expect(formatDuration(1500)).toBe('1.50s')
  })
})
