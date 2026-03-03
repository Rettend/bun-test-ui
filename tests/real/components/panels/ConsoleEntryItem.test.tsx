import type { ConsoleEntry } from '~/components/types'
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import ConsoleEntryItem from '~/components/panels/ConsoleEntryItem'
import { render } from '../../../setup/render'

describe('ConsoleEntryItem', () => {
  test('renders log level correctly', () => {
    const entry: ConsoleEntry = {
      id: 1,
      level: 'log',
      message: 'Basic log message',
      timestamp: new Date('2024-01-01T12:00:00Z').getTime(),
    }

    const { unmount } = render(() => <ConsoleEntryItem entry={entry} />)

    const badge = screen.getByText('log')
    expect(badge.className).toContain('text-emerald-300') // 'passed' color status
    expect(screen.getByText('Basic log message')).toBeTruthy()

    unmount()
  })

  test('renders error level correctly', () => {
    const entry: ConsoleEntry = {
      id: 2,
      level: 'error',
      message: 'Boom!',
      timestamp: new Date('2024-01-01T12:00:00Z').getTime(),
      source: 'file.js:10:1',
      testId: 'test-123',
    }

    const { unmount } = render(() => <ConsoleEntryItem entry={entry} />)

    const badge = screen.getByText('error')
    expect(badge.className).toContain('text-red-300') // 'failed' color status
    expect(screen.getByText('Boom!')).toBeTruthy()
    expect(screen.getByText('file.js:10:1')).toBeTruthy()
    expect(screen.getByText('Test #test-123')).toBeTruthy()

    unmount()
  })

  test('renders warn level correctly', () => {
    const entry: ConsoleEntry = {
      id: 3,
      level: 'warn',
      message: 'Watch out',
      timestamp: new Date('2024-01-01T12:00:00Z').getTime(),
    }

    const { unmount } = render(() => <ConsoleEntryItem entry={entry} />)

    const badge = screen.getByText('warn')
    expect(badge.className).toContain('text-amber-200') // 'running' color status

    unmount()
  })
})
