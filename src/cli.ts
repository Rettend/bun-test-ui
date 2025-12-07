#!/usr/bin/env bun
/* eslint-disable no-console */
import process from 'node:process'
import { getTestConfig } from './config'

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
    console.warn(`Could not open browser. Please visit: ${url}`)
  }
}

async function main() {
  const args = process.argv.slice(2)

  let port = 51205
  let testPattern = ''
  let noOpen = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--port' || arg === '-p')
      port = Number.parseInt(args[++i]!, 10) || 51205
    else if (arg === '--no-open')
      noOpen = true
    else if (!arg.startsWith('-'))
      testPattern = arg
  }

  const config = getTestConfig({
    port,
    testPattern,
    open: !noOpen,
  })

  process.env.NODE_ENV = 'production'
  process.env.BUN_TEST_UI_PORT = String(config.port)
  process.env.BUN_TEST_UI_ROOT = config.testRoot
  process.env.BUN_TEST_UI_PATTERN = config.testPattern

  console.log('🧪 Starting Bun Test UI...')
  console.log(`   Port: ${config.port}`)
  if (config.testRoot)
    console.log(`   Test root: ${config.testRoot}`)
  if (config.testPattern)
    console.log(`   Pattern: ${config.testPattern}`)

  await import('./server/index.js')

  const url = `http://localhost:${config.port}`

  if (config.open)
    setTimeout(() => openBrowser(url), 500) // TODO: remove?
}

main().catch((error) => {
  console.error('Failed to start Bun Test UI:', error)
  process.exit(1)
})
