import type { ConsoleEntry } from '~/components/types'
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import ConsolePanel from '~/components/panels/ConsolePanel'
import { render } from '../../../setup/render'

describe('ConsolePanel', () => {
  test('renders nothing when no entries exist', () => {
    const { container, unmount } = render(() => <ConsolePanel entries={[]} />)

    expect(container.innerHTML).toBe('')

    unmount()
  })

  test('renders console entries', () => {
    const entries: ConsoleEntry[] = [
      {
        id: 1,
        level: 'log',
        message: 'Hello world',
        timestamp: 1710000000000,
      },
      {
        id: 2,
        level: 'error',
        message: 'An error occurred',
        timestamp: 1710000001000,
        source: 'app.ts:42:5',
      },
    ]

    const { unmount } = render(() => <ConsolePanel entries={entries} />)

    expect(screen.getByText('Console')).toBeTruthy()
    expect(screen.getByText('2 entries')).toBeTruthy()

    expect(screen.getByText('Hello world')).toBeTruthy()
    expect(screen.getByText('An error occurred')).toBeTruthy()
    expect(screen.getByText('app.ts:42:5')).toBeTruthy()

    unmount()
  })
})
