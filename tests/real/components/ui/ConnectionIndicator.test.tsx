import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import ConnectionIndicator from '~/components/ui/ConnectionIndicator'
import { render } from '../../../setup/render'

describe('ConnectionIndicator', () => {
  test('renders connected state with label', () => {
    const { container, unmount } = render(() => <ConnectionIndicator status="connected" />)

    const dot = container.querySelector('.rounded-full') as HTMLElement
    expect(dot.className).toContain('bg-emerald-400')
    expect(screen.getByText('Bun Test UI')).toBeTruthy()
    expect(screen.getByText('Connected to inspector')).toBeTruthy()

    unmount()
  })

  test('renders connecting state styles and text', () => {
    const { container, unmount } = render(() => <ConnectionIndicator status="connecting" />)

    const dot = container.querySelector('.rounded-full') as HTMLElement
    expect(dot.className).toContain('bg-amber-400')
    expect(dot.className).toContain('animate-pulse')
    expect(screen.getByText(/Connecting/)).toBeTruthy()

    unmount()
  })

  test('supports hiding labels', () => {
    const { unmount } = render(() => <ConnectionIndicator status="disconnected" showLabel={false} />)

    expect(screen.queryByText('Bun Test UI')).toBeNull()
    expect(screen.queryByText('Disconnected')).toBeNull()

    unmount()
  })
})
