import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { afterEach } from 'bun:test'

GlobalRegistrator.register()

afterEach(() => {
  document.body.innerHTML = ''
})
