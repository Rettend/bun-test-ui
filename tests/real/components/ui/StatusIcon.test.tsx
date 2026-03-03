import type { TestStatus } from '~/components/types'
import { describe, expect, test } from 'bun:test'
import StatusIcon from '~/components/ui/StatusIcon'
import { render } from '../../../setup/render'

describe('StatusIcon', () => {
  test('maps statuses to expected icons and colors', () => {
    const scenarios: Array<{ status: TestStatus, iconClass: string, colorClass: string }> = [
      { status: 'passed', iconClass: 'i-ph:check-bold', colorClass: 'text-emerald-400' },
      { status: 'failed', iconClass: 'i-ph:x-bold', colorClass: 'text-red-400' },
      { status: 'running', iconClass: 'i-gg:spinner', colorClass: 'text-amber-400' },
      { status: 'skipped', iconClass: 'i-ph:minus-bold', colorClass: 'text-gray-500' },
      { status: 'todo', iconClass: 'i-ph:minus-bold', colorClass: 'text-gray-500' },
      { status: 'timeout', iconClass: 'i-ph:clock-bold', colorClass: 'text-orange-400' },
    ]

    for (const scenario of scenarios) {
      const { container, unmount } = render(() => (
        <StatusIcon status={scenario.status} size="lg" class="custom-class" />
      ))

      const icon = container.firstElementChild as HTMLElement
      expect(icon.className).toContain(scenario.iconClass)
      expect(icon.className).toContain(scenario.colorClass)
      expect(icon.className).toContain('text-lg')
      expect(icon.className).toContain('custom-class')

      unmount()
    }
  })

  test('uses fallback icon for idle status', () => {
    const { container, unmount } = render(() => <StatusIcon status="idle" />)

    const icon = container.firstElementChild as HTMLElement
    expect(icon.className).toContain('i-ph:circle-dashed')
    expect(icon.className).toContain('text-gray-500')
    expect(icon.className).toContain('text-base')

    unmount()
  })
})
