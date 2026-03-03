import type { JSX } from 'solid-js'
import { render as solidRender } from 'solid-js/web/dist/web.js'

export function render(ui: () => JSX.Element) {
  const container = document.createElement('div')
  document.body.append(container)

  const unmount = solidRender(ui, container)
  return { container, unmount }
}
