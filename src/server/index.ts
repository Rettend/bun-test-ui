import type { ServerWebSocket, Subprocess } from 'bun'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { WebSocketInspector } from '@rttnd/bun-inspector-protocol'
import { serve, spawn } from 'bun'
import { TCPSocketSignal } from './signal'
import { c, log } from './utils/log'
import { getFreePort } from './utils/server'
import { createFileWatcher } from './watcher'

const DIST_DIR = join(import.meta.dir, '..', '..', 'dist', 'client')
const CLIENT_DIR = join(process.cwd(), 'src', 'client')
const isDev = process.env.NODE_ENV !== 'production' || process.env.BUN_HOT === '1'

const PORT = Number.parseInt(process.env.BUN_TEST_UI_PORT ?? '51205', 10)
const TEST_ROOT = process.env.BUN_TEST_UI_ROOT ?? ''
const TEST_PATTERN = process.env.BUN_TEST_UI_PATTERN ?? ''
const WATCH_ENABLED = process.env.BUN_TEST_UI_WATCH === '1'

let devIndexHtml: any
if (isDev) {
  const devIndexImport = await import('../client/index.html', { with: { type: 'html' } } as any)
  devIndexHtml = (devIndexImport as any).default ?? devIndexImport
}

interface RunRequest {
  files?: string[]
  testNamePattern?: string
}

interface ServerState {
  signal: TCPSocketSignal | null
  process: Subprocess | null
  inspector: WebSocketInspector | null
  clients: Set<ServerWebSocket<unknown>>
}

const state: ServerState = {
  signal: null,
  process: null,
  inspector: null,
  clients: new Set(),
}

function broadcast(msg: any) {
  const str = JSON.stringify(msg)
  for (const client of state.clients)
    client.send(str)
}

function normalizeFilePath(path?: string): string | null {
  if (!path)
    return null
  try {
    if (path.startsWith('file://')) {
      const parsed = new URL(path)
      let pathname = decodeURIComponent(parsed.pathname)
      if (pathname.startsWith('/') && pathname[2] === ':')
        pathname = pathname.slice(1)
      return pathname
    }
  }
  catch {
  }
  return path
}

async function startTestRun(request?: RunRequest) {
  if (state.process) {
    state.process.kill()
    state.process = null
  }
  if (state.inspector)
    state.inspector.close()
  state.inspector = null
  if (state.signal)
    state.signal.close()

  const inspectorPort = await getFreePort()
  const inspectorUrl = `ws://127.0.0.1:${inspectorPort}/${Math.random().toString(36).slice(2)}`
  const signalPort = await getFreePort()
  state.signal = new TCPSocketSignal(signalPort)
  await state.signal.ready

  const inspector = new WebSocketInspector(inspectorUrl)
  state.inspector = inspector
  const connectState = {
    attempts: 0,
    maxAttempts: 5,
    closed: false,
  }

  let currentTestId: number | null = null

  inspector.on('TestReporter.found', (params: unknown) => {
    broadcast({ type: 'found', data: params })
  })
  inspector.on('TestReporter.start', (params: any) => {
    currentTestId = params?.id ?? null
    broadcast({ type: 'start', data: params })
  })
  inspector.on('TestReporter.end', (params: any) => {
    currentTestId = null
    broadcast({ type: 'end', data: params })
  })
  inspector.on('Runtime.consoleAPICalled', (params: any) => {
    broadcast({ type: 'console', data: params })
  })

  inspector.on('LifecycleReporter.error', (params: any) => {
    const urls: string[] = params?.urls ?? []
    const lineColumns: number[] = params?.lineColumns ?? []

    const stackLines: string[] = []
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const line = lineColumns[i * 2] ?? 0
      const column = lineColumns[i * 2 + 1] ?? 0

      if (column > 0 && line > 0)
        stackLines.push(`    at ${url}:${line}:${column}`)
      else if (line > 0)
        stackLines.push(`    at ${url}:${line}`)
      else if (url)
        stackLines.push(`    at ${url}`)
    }

    const errorName = params?.name ?? 'Error'
    const rawMessage = params?.message ?? 'Unknown error'
    const stackTrace = stackLines.length > 0 ? `\n\n${stackLines.join('\n')}` : ''
    const errorMessage = `${errorName}: ${rawMessage}${stackTrace}`

    broadcast({
      type: 'error',
      data: {
        testId: currentTestId,
        message: errorMessage,
      },
    })
  })

  let inspectorConnecting = false
  let inspectorReady = false
  const tryConnectInspector = async () => {
    if (connectState.closed || inspectorReady || inspectorConnecting)
      return
    if (connectState.attempts >= connectState.maxAttempts) {
      log.debug('Inspector connect giving up after attempts', connectState.attempts)
      connectState.closed = true
      return
    }
    connectState.attempts += 1
    inspectorConnecting = true
    log.debug('Connecting to inspector...')
    try {
      const ok = await inspector.start(inspectorUrl)
      if (!ok)
        throw new Error('Inspector.start returned false')

      inspectorReady = true
      await inspector.send('Inspector.enable')
      await inspector.send('Runtime.enable')
      await inspector.send('Console.enable')
      await inspector.send('TestReporter.enable')
      await inspector.send('LifecycleReporter.enable').catch(() => {})
      await inspector.send('Debugger.enable').catch(() => {})
      await inspector.send('Debugger.setBreakpointsActive', { active: true }).catch(() => {})
      await inspector.send('Inspector.initialized').catch(() => {})
      await inspector.send('Debugger.resume').catch(() => {})
    }
    catch (error) {
      inspectorConnecting = false
      log.debug('Inspector init failed, retrying...', error)
      setTimeout(tryConnectInspector, 300)
      return
    }
    inspectorConnecting = false
  }

  inspector.on('Inspector.connected', () => {
    inspectorReady = true
    inspectorConnecting = false
  })
  inspector.on('Inspector.disconnected', (error) => {
    inspectorReady = false
    inspectorConnecting = false
    if (error)
      log.debug('Inspector disconnected', error)
  })
  inspector.on('Inspector.error', (error) => {
    log.debug('Inspector error', error)
  })

  state.signal.on('Signal.Socket.connect', tryConnectInspector)
  state.signal.on('Signal.received', tryConnectInspector)
  state.signal.on('Signal.error', error => log.debug('Inspector signal error', error))

  const requestedFiles = Array.from(
    new Set((request?.files ?? []).map(normalizeFilePath).filter(Boolean) as string[]),
  )

  const testCmd = ['bun', 'test']

  if (requestedFiles.length)
    testCmd.push(...requestedFiles)
  else if (TEST_ROOT)
    testCmd.push(TEST_ROOT)

  if (!requestedFiles.length && TEST_PATTERN)
    testCmd.push(TEST_PATTERN)

  if (request?.testNamePattern)
    testCmd.push('--test-name-pattern', request.testNamePattern)

  state.process = spawn({
    cmd: testCmd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      BUN_INSPECT: `${inspectorUrl}?wait=1`,
      BUN_INSPECT_NOTIFY: state.signal.url,
    },
  })

  state.process.exited?.then((code) => {
    connectState.closed = true
    broadcast({ type: 'exit', code })
  }).catch(() => {})

  async function streamOutput(reader: any, type: 'stdout' | 'stderr') {
    const decoder = new TextDecoder()
    const output = type === 'stdout' ? process.stdout : process.stderr
    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break
      const text = decoder.decode(value)
      output.write(text)
      broadcast({ type: 'output', stream: type, data: text })
    }
  }

  if (state.process.stdout && typeof state.process.stdout !== 'number')
    streamOutput(state.process.stdout.getReader(), 'stdout').catch(() => {})
  if (state.process.stderr && typeof state.process.stderr !== 'number')
    streamOutput(state.process.stderr.getReader(), 'stderr').catch(() => {})
}

serve({
  port: PORT,
  development: isDev ? { hmr: true, console: true } : undefined,
  routes: isDev
    ? {
        '/': devIndexHtml,
      }
    : undefined,
  async fetch(req, server) {
    const url = new URL(req.url)
    if (url.pathname === '/ws') {
      if (server.upgrade(req))
        return undefined
      return new Response('Upgrade failed', { status: 500 })
    }

    if (url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
      return new Response(JSON.stringify({}), {
        headers: { 'content-type': 'application/json' },
      })
    }

    let path = url.pathname === '/' ? 'index.html' : url.pathname
    if (path.startsWith('/'))
      path = path.slice(1)

    const baseDir = isDev ? CLIENT_DIR : DIST_DIR
    const filePath = join(baseDir, path)
    const file = Bun.file(filePath)

    if (isDev) {
      if (!(await file.exists()))
        return new Response('Not Found', { status: 404 })
      return new Response(file)
    }

    return new Response(file)
  },
  websocket: {
    message(ws, message) {
      try {
        const data = JSON.parse(String(message))
        if (data.type === 'run') {
          const files = Array.isArray(data.files) ? data.files : undefined
          const testNamePattern = typeof data.testNamePattern === 'string' && data.testNamePattern.trim()
            ? data.testNamePattern
            : undefined
          startTestRun({ files, testNamePattern })
        }
      }
      catch {
      }
    },
    open(ws) {
      state.clients.add(ws)
    },
    close(ws) {
      state.clients.delete(ws)
    },
  },
})

if (isDev) {
  log.info(`${c.bold('bun test ui')} ${c.dim('dev')}`)
  log.info('')
  log.info(c.cyan(`http://localhost:${PORT}`))
  log.info('')
}

if (WATCH_ENABLED) {
  const watchPaths: string[] = []

  try {
    const entries = await readdir(process.cwd(), { withFileTypes: true })
    const ignored = new Set(['node_modules', '.git', '.idea', '.vscode', '.next', 'dist', 'build', 'out', 'coverage'])

    for (const entry of entries) {
      if (ignored.has(entry.name) || (entry.name.startsWith('.') && entry.isDirectory()))
        continue
      watchPaths.push(entry.name)
    }
  }
  catch {
    watchPaths.push('.')
  }

  const watcher = createFileWatcher({
    paths: watchPaths,
    onChange: (info) => {
      broadcast({
        type: 'file-changed',
        data: {
          filename: info.filename,
          fullPath: info.fullPath,
          isTestFile: info.isTestFile,
        },
      })
    },
    debounceMs: 50,
  })

  process.on('SIGINT', () => {
    watcher.close()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    watcher.close()
    process.exit(0)
  })
}
