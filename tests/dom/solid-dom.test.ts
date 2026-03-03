/// <reference lib="dom" />

import { fireEvent, screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import { createEffect, createRoot, createSignal } from 'solid-js/dist/solid.js'

function mountCounter(initial: number) {
  const host = document.createElement('div')
  document.body.append(host)
  return createRoot((dispose) => {
    const [count, setCount] = createSignal(initial)

    const button = document.createElement('button')
    button.dataset.testid = 'inc'
    button.textContent = 'Increment'
    button.addEventListener('click', () => setCount(value => value + 1))

    const value = document.createElement('span')
    value.dataset.testid = 'count'

    createEffect(() => {
      value.textContent = String(count())
    })

    host.append(button, value)
    return { dispose }
  })
}

function mountStatus(running: boolean) {
  const host = document.createElement('div')
  document.body.append(host)
  return createRoot((dispose) => {
    const [phase] = createSignal(running ? 'running' : 'done')
    const node = document.createElement('p')
    node.dataset.testid = 'phase'

    createEffect(() => {
      node.textContent = phase()
    })

    host.append(node)
    return { dispose }
  })
}

describe('Solid DOM tests', () => {
  test('updates rendered content after click', async () => {
    const app = mountCounter(1)

    await Promise.resolve()

    expect(screen.getByTestId('count').textContent).toBe('1')

    fireEvent.click(screen.getByTestId('inc'))
    await Promise.resolve()

    expect(screen.getByTestId('count').textContent).toBe('2')

    app.dispose()
  })

  test('renders static status content', async () => {
    const app = mountStatus(true)

    await Promise.resolve()

    expect(screen.getByTestId('phase').textContent).toBe('running')

    app.dispose()
  })
})
