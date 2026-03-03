import type { TestSummary } from '~/components/types'
import { describe, expect, test } from 'bun:test'
import ProgressBar from '~/components/layout/ProgressBar'
import { render } from '../../../setup/render'

function createSummary(overrides: Partial<TestSummary> = {}): TestSummary {
  return {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    running: 0,
    duration: 0,
    ...overrides,
  }
}

describe('ProgressBar', () => {
  test('renders loading fallback when no tests are complete', () => {
    const { container, unmount } = render(() => <ProgressBar summary={createSummary()} />)

    const bars = Array.from(container.querySelectorAll('.h-full')) as HTMLElement[]
    expect(bars.length).toBe(1)
    expect(bars[0]?.className).toContain('animate-pulse')

    unmount()
  })

  test('renders pass/fail/skip widths from summary values', () => {
    const { container, unmount } = render(() => (
      <ProgressBar
        summary={createSummary({
          passed: 6,
          failed: 3,
          skipped: 1,
        })}
      />
    ))

    const bars = Array.from(container.querySelectorAll('.h-full')) as HTMLElement[]
    const [passed, failed, skipped] = bars

    expect(bars.length).toBe(3)
    expect(passed?.style.width).toBe('60%')
    expect(failed?.style.width).toBe('30%')
    expect(skipped?.style.width).toBe('10%')

    unmount()
  })
})
