import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import StatusBadge from '~/components/ui/StatusBadge'
import { render } from '../../../setup/render'

describe('StatusBadge', () => {
  test('renders passed status badge', () => {
    const { unmount } = render(() => <StatusBadge status="passed" />)

    const badge = screen.getByText('passed')
    expect(badge.className).toContain('text-emerald-300')

    unmount()
  })

  test('renders timeout status badge', () => {
    const { unmount } = render(() => <StatusBadge status="timeout" />)

    const badge = screen.getByText('timeout')
    expect(badge.className).toContain('text-orange-300')

    unmount()
  })
})
