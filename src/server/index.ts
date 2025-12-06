import type { ServerWebSocket, Subprocess } from 'bun'
import { join } from 'node:path'
import process from 'node:process'
import { WebSocketInspector } from '@rttnd/bun-inspector-protocol'
import { serve, spawn } from 'bun'
import { TCPSocketSignal } from './signal'
import { getFreePort } from './utils'

const DIST_DIR = join(process.cwd(), 'dist', 'client')
const CLIENT_DIR = join(process.cwd(), 'src', 'client')
const isDev = process.env.NODE_ENV !== 'production' || process.env.BUN_HOT === '1'

const PORT = Number.parseInt(process.env.BUN_TEST_UI_PORT ?? '51205', 10)
const TEST_ROOT = process.env.BUN_TEST_UI_ROOT ?? ''
const TEST_PATTERN = process.env.BUN_TEST_UI_PATTERN ?? ''

let devIndexHtml: any
if (isDev) {
  // Bun HTML import provides bundled dev asset (with virtual:uno.css resolved)
  const devIndexImport = await import('../client/index.html', { with: { type: 'html' } } as any)
  devIndexHtml = (devIndexImport as any).default ?? devIndexImport
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

async function startTestRun() {
  console.warn('Starting test run...')
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

  inspector.on('TestReporter.found', (params: unknown) => {
    broadcast({ type: 'found', data: params })
  })
  inspector.on('TestReporter.start', (params: unknown) => {
    broadcast({ type: 'start', data: params })
  })
  inspector.on('TestReporter.end', (params: unknown) => {
    broadcast({ type: 'end', data: params })
  })
  inspector.on('Runtime.consoleAPICalled', (params: any) => {
    broadcast({ type: 'console', data: params })
  })

  let inspectorConnecting = false
  let inspectorReady = false
  const tryConnectInspector = async () => {
    if (connectState.closed || inspectorReady || inspectorConnecting)
      return
    if (connectState.attempts >= connectState.maxAttempts) {
      console.warn('Inspector connect giving up after attempts', connectState.attempts)
      connectState.closed = true
      return
    }
    connectState.attempts += 1
    inspectorConnecting = true
    console.warn('Inspector signal received, connecting to WebSocket inspector...')
    try {
      const ok = await inspector.start(inspectorUrl)
      if (!ok)
        throw new Error('Inspector.start returned false')

      inspectorReady = true
      await inspector.send('Inspector.enable')
      await inspector.send('Runtime.enable')
      await inspector.send('Console.enable')
      await inspector.send('TestReporter.enable')
      await inspector.send('Debugger.enable').catch((err: any) => {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg !== 'Debugger domain already enabled')
          console.warn('Debugger.enable failed', err)
      })
      await inspector.send('Debugger.setBreakpointsActive', { active: true }).catch(() => {})
      await inspector.send('Inspector.initialized').catch(() => {})
      await inspector.send('Debugger.resume').catch(() => {})
      console.warn('Inspector ready')
    }
    catch (error) {
      inspectorConnecting = false
      console.error('Inspector init failed', error)
      broadcast({ type: 'output', stream: 'stderr', data: `Inspector init failed: ${error instanceof Error ? error.message : String(error)}` })
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
      console.warn('Inspector disconnected', error)
  })
  inspector.on('Inspector.error', (error) => {
    console.error('Inspector error', error)
  })

  state.signal.on('Signal.Socket.connect', tryConnectInspector)
  state.signal.on('Signal.received', tryConnectInspector)
  state.signal.on('Signal.error', error => console.error('Inspector signal error', error))

  console.warn(`Spawning bun test with BUN_INSPECT=${inspectorUrl}?wait=1 (notify ${state.signal.url})`)

  // Build the test command
  const testCmd = ['bun', 'test']
  if (TEST_ROOT)
    testCmd.push(TEST_ROOT)
  if (TEST_PATTERN)
    testCmd.push(TEST_PATTERN)

  console.warn(`Spawning: ${testCmd.join(' ')}`)

  state.process = spawn({
    cmd: testCmd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      // Pause until inspector attaches so we don't miss TestReporter events
      BUN_INSPECT: `${inspectorUrl}?wait=1`,
      BUN_INSPECT_NOTIFY: state.signal.url,
    },
  })

  state.process.exited?.then((code) => {
    console.warn('bun test exited', code)
    connectState.closed = true
    broadcast({ type: 'exit', code })
  }).catch((error) => {
    console.error('Failed waiting for test process exit', error)
  })

  async function streamOutput(reader: any, type: 'stdout' | 'stderr') {
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break
      const text = decoder.decode(value)
      broadcast({ type: 'output', stream: type, data: text })
    }
  }

  if (state.process.stdout && typeof state.process.stdout !== 'number')
    streamOutput(state.process.stdout.getReader(), 'stdout').catch((e: any) => console.error('stdout stream failed', e))
  if (state.process.stderr && typeof state.process.stderr !== 'number')
    streamOutput(state.process.stderr.getReader(), 'stderr').catch((e: any) => console.error('stderr stream failed', e))
}

const server = serve({
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

    // static files (dev from src/client, prod from dist)
    let path = url.pathname === '/' ? 'index.html' : url.pathname
    if (path.startsWith('/'))
      path = path.slice(1)

    // dev: let routes/html import handle bundling
    const baseDir = isDev ? CLIENT_DIR : DIST_DIR
    const filePath = join(baseDir, path)
    const file = Bun.file(filePath)

    if (isDev) {
      // dev: let Bun handle TSX/HTML with HMR, 404 when missing
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
        if (data.type === 'run')
          startTestRun()
      }
      catch (e) {
        console.error('Failed to parse message', e)
      }
    },
    open(ws) {
      state.clients.add(ws)
      console.warn('Client connected')
    },
    close(ws) {
      state.clients.delete(ws)
    },
  },
})

console.warn(`Listening on http://localhost:${server.port}`)
