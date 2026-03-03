import { describe, expect, test } from 'bun:test'
import { formatCoveragePct } from '../../src/client/components/panels/Coverage'

describe('formatCoveragePct', () => {
  test('shows dash when metric is unavailable', () => {
    expect(formatCoveragePct(0, 0, 0)).toBe('—')
  })

  test('shows zero percent when total exists but none covered', () => {
    expect(formatCoveragePct(0, 12, 0)).toBe('0.0%')
  })

  test('formats non-zero percentages', () => {
    expect(formatCoveragePct(8, 10, 80)).toBe('80.0%')
    expect(formatCoveragePct(1, 3, 33.3333)).toBe('33.3%')
  })
})
