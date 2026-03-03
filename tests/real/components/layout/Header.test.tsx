import type { ActiveTab } from '~/components/layout/Header'
import type { TestSummary } from '~/components/types'
import { fireEvent, screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import Header from '~/components/layout/Header'
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

describe('Header', () => {
  test('renders counters, active tab, and run action when idle', () => {
    let runCount = 0
    const tabChanges: ActiveTab[] = []

    const { container, unmount } = render(() => (
      <Header
        connection="connected"
        phase="idle"
        activeTab="dashboard"
        summary={createSummary({
          passed: 7,
          failed: 1,
          skipped: 2,
          duration: 1250,
        })}
        onRunTests={() => runCount += 1}
        onTabChange={tab => tabChanges.push(tab)}
      />
    ))

    const dashboardButton = container.querySelector('button[title="Dashboard"]') as HTMLButtonElement
    const coverageButton = container.querySelector('button[title="Coverage"]') as HTMLButtonElement
    const runButton = screen.getByRole('button', { name: 'Run Tests' }) as HTMLButtonElement

    expect(dashboardButton.className).toContain('text-pink-400')
    expect(coverageButton.className).toContain('text-gray-500')
    expect(runButton.disabled).toBe(false)

    expect(screen.getByText('7')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('1.25s')).toBeTruthy()

    fireEvent.click(coverageButton)
    fireEvent.click(runButton)

    expect(tabChanges).toEqual(['coverage'])
    expect(runCount).toBe(1)

    unmount()
  })

  test('disables run action when disconnected or already running', () => {
    const { container, unmount } = render(() => (
      <Header
        connection="disconnected"
        phase="running"
        activeTab="coverage"
        summary={createSummary({ running: 2 })}
        onRunTests={() => {}}
        onTabChange={() => {}}
      />
    ))

    const coverageButton = container.querySelector('button[title="Coverage"]') as HTMLButtonElement
    const runButton = screen.getByRole('button', { name: 'Rerun Tests' }) as HTMLButtonElement

    expect(coverageButton.className).toContain('text-pink-400')
    expect(runButton.disabled).toBe(true)
    expect(screen.getByText('RUNNING')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(container.innerHTML).toContain('i-gg:spinner')

    unmount()
  })
})
