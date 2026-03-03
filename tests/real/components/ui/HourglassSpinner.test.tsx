import { describe, expect, test } from 'bun:test'
import HourglassSpinner from '~/components/ui/HourglassSpinner'
import { render } from '../../../setup/render'

describe('HourglassSpinner', () => {
  test('renders the initial frame and merges custom classes', () => {
    const { container, unmount } = render(() => <HourglassSpinner class="text-amber-400" />)

    const spinner = container.firstElementChild as HTMLElement
    expect(spinner.className).toContain('i-ph:hourglass-duotone')
    expect(spinner.className).toContain('text-amber-400')
    expect(spinner.style.transform).toBe('rotate(0deg)')

    unmount()
  })

  test('advances frames over time', async () => {
    const { container, unmount } = render(() => <HourglassSpinner />)

    const spinner = container.firstElementChild as HTMLElement
    const initialClass = spinner.className

    await new Promise(resolve => setTimeout(resolve, 350))

    expect(spinner.className).not.toBe(initialClass)

    unmount()
  })
})
