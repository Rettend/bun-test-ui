import { fireEvent, screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import Button from '~/components/ui/Button'
import { render } from '../../../setup/render'

describe('Button', () => {
  test('renders primary medium button by default and handles click', () => {
    let clickCount = 0
    const { unmount } = render(() => <Button onClick={() => clickCount += 1}>Run tests</Button>)

    const button = screen.getByRole('button', { name: 'Run tests' }) as HTMLButtonElement
    expect(button.className).toContain('bg-#f472b6')
    expect(button.className).toContain('px-4')
    expect(button.className).toContain('py-1.5')

    fireEvent.click(button)
    expect(clickCount).toBe(1)

    unmount()
  })

  test('applies requested variant and size and supports disabled state', () => {
    let clickCount = 0
    const { unmount } = render(() => (
      <Button variant="secondary" size="lg" disabled onClick={() => clickCount += 1}>
        Disabled action
      </Button>
    ))

    const button = screen.getByRole('button', { name: 'Disabled action' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.className).toContain('bg-white/5')
    expect(button.className).toContain('px-5')
    expect(button.className).toContain('text-base')

    fireEvent.click(button)
    expect(clickCount).toBe(0)

    unmount()
  })
})
