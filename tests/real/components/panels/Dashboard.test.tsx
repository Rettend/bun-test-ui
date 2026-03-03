import type { TestSummary } from '~/components/types'
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import Dashboard from '~/components/panels/Dashboard'
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

describe('Dashboard', () => {
  test('renders empty state when no tests exist', () => {
    const { unmount } = render(() => (
      <Dashboard summary={createSummary()} phase="idle" />
    ))

    expect(container.textContent).toContain('No test results yet')
    expect(container.textContent).toContain('Press Run Tests to start')

    unmount()
  })

  test('renders cards and stats when tests exist', () => {
    const summary = createSummary({
      total: 10,
      passed: 6,
      failed: 3,
      skipped: 1,
      duration: 1500, // 1.50s
    })

    const { unmount } = render(() => (
      <Dashboard summary={summary} phase="done" />
    ))

    // Should not show empty state
    expect(container.textContent).not.toContain('No test results yet')

    // Summaries
    expect(screen.getByText('Passed')).toBeTruthy()
    expect(screen.getByText('6')).toBeTruthy()

    expect(screen.getByText('Failed')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()

    expect(screen.getByText('Skipped')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()

    expect(screen.getByText('Total')).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()

    // Pass rate: (6 / (6+3)) = 66.66% -> 67%
    expect(screen.getByText('67%')).toBeTruthy()
    expect(screen.getByText('Pass Rate')).toBeTruthy()

    // Duration
    expect(screen.getByText('1.50s')).toBeTruthy()

    unmount()
  })

  test('shows running indicator when tests are running', () => {
    const summary = createSummary({
      total: 5,
      running: 2,
    })

    const { unmount } = render(() => (
      <Dashboard summary={summary} phase="running" />
    ))

    expect(container.textContent).toContain('Running 2 tests...')

    // The spinner container shouldn't be fully hidden
    const spinnerEl = container.querySelector('.i-gg\\:spinner')
    expect(spinnerEl).toBeTruthy()

    unmount()
  })

  test('shows empty state pass rate fallback', () => {
    // Tests are running but pass/fail are zero
    const summary = createSummary({
      total: 1,
      passed: 0,
      failed: 0,
      running: 1,
    })

    const { unmount } = render(() => (
      <Dashboard summary={summary} phase="running" />
    ))

    expect(screen.getByText('0%')).toBeTruthy()

    unmount()
  })
})
