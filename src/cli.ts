#!/usr/bin/env bun
import process from 'node:process'
import { getTestConfig } from './config'
import { c, log } from './server/utils/log'

async function openBrowser(url: string) {
  const { platform } = process
  let cmd: string[]

  if (platform === 'darwin')
    cmd = ['open', url]
  else if (platform === 'win32')
    cmd = ['cmd', '/c', 'start', '', url]
  else
    cmd = ['xdg-open', url]

  try {
    const proc = Bun.spawn(cmd, { stdout: 'ignore', stderr: 'ignore' })
    await proc.exited
  }
  catch {
  }
}

async function main() {
  const args = process.argv.slice(2)

  let port = 51205
  let testPattern = ''
  let noOpen = false
  let noWatch = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--port' || arg === '-p')
      port = Number.parseInt(args[++i]!, 10) || 51205
    else if (arg === '--no-open')
      noOpen = true
    else if (arg === '--no-watch')
      noWatch = true
    else if (!arg.startsWith('-'))
      testPattern = arg
  }

  const config = getTestConfig({
    port,
    testPattern,
    open: !noOpen,
    watch: !noWatch,
  })

  process.env.NODE_ENV = 'production'
  process.env.BUN_TEST_UI_PORT = String(config.port)
  process.env.BUN_TEST_UI_ROOT = config.testRoot
  process.env.BUN_TEST_UI_PATTERN = config.testPattern
  process.env.BUN_TEST_UI_WATCH = config.watch ? '1' : ''
  process.env.BUN_TEST_UI_PRELOAD = JSON.stringify(config.preload)

  log.info(`${c.bold('bun test ui')} ${c.dim('v0.1')}`)
  log.info('')
  log.info(c.cyan(`http://localhost:${config.port}`))
  log.info('')

  await import('./server/index.js')

  const url = `http://localhost:${config.port}`

  if (config.open)
    setTimeout(() => openBrowser(url), 500)
}

main().catch((error) => {
  log.error('Failed to start:', error)
  process.exit(1)
})
