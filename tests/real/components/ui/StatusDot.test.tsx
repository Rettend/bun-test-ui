import { describe, expect, test } from 'bun:test'
import StatusDot from '~/components/ui/StatusDot'
import { render } from '../../../setup/render'

describe('StatusDot', () => {
  test('uses medium size by default', () => {
    const { container, unmount } = render(() => <StatusDot status="passed" />)

    const dot = container.firstElementChild as HTMLElement
    expect(dot.className).toContain('h-2.5')
    expect(dot.className).toContain('w-2.5')
    expect(dot.className).toContain('bg-emerald-400')

    unmount()
  })

  test('applies large running styles when requested', () => {
    const { container, unmount } = render(() => <StatusDot status="running" size="lg" />)

    const dot = container.firstElementChild as HTMLElement
    expect(dot.className).toContain('h-3')
    expect(dot.className).toContain('w-3')
    expect(dot.className).toContain('animate-pulse')

    unmount()
  })
})
