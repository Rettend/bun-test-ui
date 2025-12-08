/* eslint-disable no-console */
import process from 'node:process'

export { default as c } from 'picocolors'

const isDebug = process.env.BUN_TEST_UI_DEBUG === '1'

export const log = {
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => {
    if (isDebug)
      console.log('[debug]', ...args)
  },
}
