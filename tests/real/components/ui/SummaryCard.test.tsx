import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import SummaryCard from '~/components/ui/SummaryCard'
import { render } from '../../../setup/render'

describe('SummaryCard', () => {
  test('renders icon, value, and label styles', () => {
    const { container, unmount } = render(() => (
      <SummaryCard
        icon="i-ph:check-circle-duotone"
        iconColor="text-emerald-400"
        label="Passed"
        value={12}
        valueColor="text-emerald-300"
      />
    ))

    const card = container.firstElementChild as HTMLElement
    const icon = card.firstElementChild?.firstElementChild as HTMLElement
    const value = screen.getByText('12')
    const label = screen.getByText('Passed')

    expect(icon.className).toContain('i-ph:check-circle-duotone')
    expect(icon.className).toContain('text-emerald-400')
    expect(value.className).toContain('text-emerald-300')
    expect(label.className).toContain('text-gray-500')

    unmount()
  })

  test('supports string values', () => {
    const { unmount } = render(() => (
      <SummaryCard
        icon="i-ph:clock-bold"
        iconColor="text-orange-400"
        label="Duration"
        value="1.23s"
        valueColor="text-orange-300"
      />
    ))

    expect(screen.getByText('1.23s')).toBeTruthy()
    expect(screen.getByText('Duration')).toBeTruthy()

    unmount()
  })
})
