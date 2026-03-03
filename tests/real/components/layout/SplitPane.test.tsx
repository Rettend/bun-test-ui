import { describe, expect, test } from 'bun:test'
import SplitPane from '~/components/layout/SplitPane'
import { render } from '../../../setup/render'

function renderSplitPane(overrides: {
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
  storageKey?: string
} = {}) {
  return render(() => (
    <SplitPane
      left={<div>Left panel</div>}
      right={<div>Right panel</div>}
      initialWidth={256}
      minWidth={180}
      maxWidth={600}
      storageKey="split-pane-width"
      {...overrides}
    />
  ))
}

function dispatchMouse(target: EventTarget, type: 'mousedown' | 'mousemove' | 'mouseup' | 'dblclick', clientX = 0) {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true, cancelable: true, clientX }))
}

describe('SplitPane', () => {
  test('loads and clamps initial width from localStorage', () => {
    localStorage.setItem('split-pane-width', '900')

    const { container, unmount } = renderSplitPane()
    const root = container.firstElementChild as HTMLElement
    const leftPane = root.children[0] as HTMLElement

    expect(leftPane.style.width).toBe('600px')

    unmount()
    localStorage.clear()
  })

  test('supports dragging and persists width on mouse up', async () => {
    localStorage.clear()

    const { container, unmount } = renderSplitPane({
      storageKey: 'split-pane-drag',
      initialWidth: 240,
    })

    await Promise.resolve()

    const root = container.firstElementChild as HTMLElement
    const leftPane = root.children[0] as HTMLElement
    const divider = root.children[1] as HTMLElement

    dispatchMouse(divider, 'mousedown', 240)
    dispatchMouse(document, 'mousemove', 140)
    expect(leftPane.style.width).toBe('180px')

    dispatchMouse(document, 'mousemove', 420)
    expect(leftPane.style.width).toBe('420px')

    dispatchMouse(document, 'mouseup', 420)
    expect(localStorage.getItem('split-pane-drag')).toBe('420')

    unmount()
    localStorage.clear()
  })

  test('resets to default width on divider double click', async () => {
    localStorage.clear()

    const { container, unmount } = renderSplitPane({
      storageKey: 'split-pane-reset',
      initialWidth: 300,
    })

    await Promise.resolve()

    const root = container.firstElementChild as HTMLElement
    const leftPane = root.children[0] as HTMLElement
    const divider = root.children[1] as HTMLElement

    dispatchMouse(divider, 'mousedown', 300)
    dispatchMouse(document, 'mousemove', 500)
    dispatchMouse(document, 'mouseup', 500)
    expect(leftPane.style.width).toBe('500px')

    dispatchMouse(divider, 'dblclick')
    expect(leftPane.style.width).toBe('300px')
    expect(localStorage.getItem('split-pane-reset')).toBe('300')

    unmount()
    localStorage.clear()
  })
})
