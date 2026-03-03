import type { ServerWebSocket, Subprocess } from 'bun'
import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
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
const COVERAGE_ENABLED = process.env.BUN_TEST_UI_COVERAGE === '1'
const COVERAGE_DIR = process.env.BUN_TEST_UI_COVERAGE_DIR ?? 'coverage'

let devIndexHtml: any
if (isDev) {
  const devIndexImport = await import('../client/index.html', { with: { type: 'html' } } as any)
  devIndexHtml = (devIndexImport as any).default ?? devIndexImport
}

interface RunRequest {
  files?: string[]
  testNamePattern?: string
  requestId?: number
}

interface ServerState {
  signal: TCPSocketSignal | null
  process: Subprocess | null
  inspector: WebSocketInspector | null
  clients: Set<ServerWebSocket<unknown>>
  activeRunId: number
}

const state: ServerState = {
  signal: null,
  process: null,
  inspector: null,
  clients: new Set(),
  activeRunId: 0,
}

let nextRunId = 0
let runStartQueue: Promise<void> = Promise.resolve()

interface CoverageMetric {
  covered: number
  total: number
  pct: number
}

interface CoverageFile {
  path: string
  lines: CoverageMetric
  functions: CoverageMetric
  branches: CoverageMetric
}

interface CoverageReport {
  enabled: boolean
  dir: string
  totals: {
    lines: CoverageMetric
    functions: CoverageMetric
    branches: CoverageMetric
  }
  files: CoverageFile[]
}

function broadcast(msg: any) {
  const str = JSON.stringify(msg)
  for (const client of state.clients)
    client.send(str)
}

function isRunActive(runId: number): boolean {
  return state.activeRunId === runId
}

function broadcastRun(runId: number, msg: Record<string, any>) {
  if (!isRunActive(runId))
    return
  broadcast({ ...msg, runId })
}

function toPathKey(path?: string | null): string | null {
  const normalized = normalizeFilePath(path ?? undefined)
  return normalized ? normalized.replaceAll('\\', '/') : null
}

function stopCurrentRun() {
  if (state.process) {
    state.process.kill()
    state.process = null
  }

  if (state.inspector) {
    state.inspector.close()
    state.inspector = null
  }

  if (state.signal) {
    state.signal.close()
    state.signal = null
  }
}

function toCoverageMetric(covered: number, total: number): CoverageMetric {
  const safeCovered = Math.max(0, covered)
  const safeTotal = Math.max(0, total)
  const pct = safeTotal > 0 ? Number(((safeCovered / safeTotal) * 100).toFixed(1)) : 0

  return {
    covered: safeCovered,
    total: safeTotal,
    pct,
  }
}

function normalizeCoveragePath(filePath: string): string {
  if (!filePath)
    return filePath

  const relativePath = relative(process.cwd(), filePath)
  return (relativePath || filePath).replaceAll('\\', '/')
}

function parseLcov(content: string): CoverageReport {
  const files: CoverageFile[] = []

  let currentPath: string | null = null
  let linesFound = 0
  let linesHit = 0
  let functionsFound = 0
  let functionsHit = 0
  let branchesFound = 0
  let branchesHit = 0

  let daFound = 0
  let daHit = 0
  let fndaFound = 0
  let fndaHit = 0
  let brdaFound = 0
  let brdaHit = 0

  const flush = () => {
    if (!currentPath)
      return

    const effectiveLinesFound = linesFound > 0 ? linesFound : daFound
    const effectiveLinesHit = linesFound > 0 ? linesHit : daHit
    const effectiveFunctionsFound = functionsFound > 0 ? functionsFound : fndaFound
    const effectiveFunctionsHit = functionsFound > 0 ? functionsHit : fndaHit
    const effectiveBranchesFound = branchesFound > 0 ? branchesFound : brdaFound
    const effectiveBranchesHit = branchesFound > 0 ? branchesHit : brdaHit

    files.push({
      path: normalizeCoveragePath(currentPath),
      lines: toCoverageMetric(effectiveLinesHit, effectiveLinesFound),
      functions: toCoverageMetric(effectiveFunctionsHit, effectiveFunctionsFound),
      branches: toCoverageMetric(effectiveBranchesHit, effectiveBranchesFound),
    })

    currentPath = null
    linesFound = 0
    linesHit = 0
    functionsFound = 0
    functionsHit = 0
    branchesFound = 0
    branchesHit = 0
    daFound = 0
    daHit = 0
    fndaFound = 0
    fndaHit = 0
    brdaFound = 0
    brdaHit = 0
  }

  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    if (!line)
      continue

    if (line.startsWith('SF:')) {
      flush()
      currentPath = line.slice(3).trim()
      continue
    }

    if (line === 'end_of_record') {
      flush()
      continue
    }

    if (!currentPath)
      continue

    if (line.startsWith('LF:')) {
      linesFound = Number.parseInt(line.slice(3), 10) || 0
      continue
    }
    if (line.startsWith('LH:')) {
      linesHit = Number.parseInt(line.slice(3), 10) || 0
      continue
    }
    if (line.startsWith('FNF:')) {
      functionsFound = Number.parseInt(line.slice(4), 10) || 0
      continue
    }
    if (line.startsWith('FNH:')) {
      functionsHit = Number.parseInt(line.slice(4), 10) || 0
      continue
    }
    if (line.startsWith('BRF:')) {
      branchesFound = Number.parseInt(line.slice(4), 10) || 0
      continue
    }
    if (line.startsWith('BRH:')) {
      branchesHit = Number.parseInt(line.slice(4), 10) || 0
      continue
    }

    if (line.startsWith('DA:')) {
      const [, hits] = line.slice(3).split(',', 2)
      const hitCount = Number.parseInt(hits ?? '0', 10) || 0
      daFound += 1
      if (hitCount > 0)
        daHit += 1
      continue
    }

    if (line.startsWith('FNDA:')) {
      const payload = line.slice(5)
      const [hits] = payload.split(',', 1)
      const hitCount = Number.parseInt(hits ?? '0', 10) || 0
      fndaFound += 1
      if (hitCount > 0)
        fndaHit += 1
      continue
    }

    if (line.startsWith('BRDA:')) {
      const parts = line.slice(5).split(',')
      const taken = parts[3]
      brdaFound += 1
      if (taken && taken !== '-' && (Number.parseInt(taken, 10) || 0) > 0)
        brdaHit += 1
    }
  }

  flush()
  files.sort((a, b) => a.path.localeCompare(b.path))

  const totals = files.reduce(
    (acc, file) => {
      acc.linesCovered += file.lines.covered
      acc.linesTotal += file.lines.total
      acc.functionsCovered += file.functions.covered
      acc.functionsTotal += file.functions.total
      acc.branchesCovered += file.branches.covered
      acc.branchesTotal += file.branches.total
      return acc
    },
    {
      linesCovered: 0,
      linesTotal: 0,
      functionsCovered: 0,
      functionsTotal: 0,
      branchesCovered: 0,
      branchesTotal: 0,
    },
  )

  return {
    enabled: COVERAGE_ENABLED,
    dir: COVERAGE_DIR,
    totals: {
      lines: toCoverageMetric(totals.linesCovered, totals.linesTotal),
      functions: toCoverageMetric(totals.functionsCovered, totals.functionsTotal),
      branches: toCoverageMetric(totals.branchesCovered, totals.branchesTotal),
    },
    files,
  }
}

async function readCoverageReport(): Promise<CoverageReport | null> {
  if (!COVERAGE_ENABLED)
    return null

  const lcovPath = join(process.cwd(), COVERAGE_DIR, 'lcov.info')
  const lcovFile = Bun.file(lcovPath)
  if (!(await lcovFile.exists())) {
    return {
      enabled: true,
      dir: COVERAGE_DIR,
      totals: {
        lines: toCoverageMetric(0, 0),
        functions: toCoverageMetric(0, 0),
        branches: toCoverageMetric(0, 0),
      },
      files: [],
    }
  }

  try {
    const lcovContent = await lcovFile.text()
    return parseLcov(lcovContent)
  }
  catch (error) {
    log.debug('Failed to parse coverage report', error)
    return null
  }
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

async function startTestRun(runId: number, request?: RunRequest) {
  stopCurrentRun()
  state.activeRunId = runId

  const inspectorPort = await getFreePort()
  const inspectorUrl = `ws://127.0.0.1:${inspectorPort}/${Math.random().toString(36).slice(2)}`
  const signalPort = await getFreePort()
  const signal = new TCPSocketSignal(signalPort)
  state.signal = signal
  await signal.ready

  if (!isRunActive(runId)) {
    signal.close()
    return
  }

  const inspector = new WebSocketInspector(inspectorUrl)
  state.inspector = inspector
  const connectState = {
    attempts: 0,
    maxAttempts: 5,
    closed: false,
  }

  const testsByFile = new Map<string, Array<{ id: number, line: number }>>()
  let currentTestId: number | null = null

  broadcastRun(runId, {
    type: 'run-start',
    requestId: request?.requestId ?? null,
    filtered: Boolean(request?.files?.length || request?.testNamePattern),
    coverageEnabled: COVERAGE_ENABLED,
    coverageDir: COVERAGE_DIR,
  })

  const indexFoundTest = (params: any) => {
    if (params?.type !== 'test')
      return

    const testId = typeof params?.id === 'number' ? params.id : Number(params?.id)
    const testLine = typeof params?.line === 'number' ? params.line : Number(params?.line)
    const pathKey = toPathKey(params?.url)

    if (!pathKey || !Number.isFinite(testId) || !Number.isFinite(testLine) || testLine <= 0)
      return

    const items = testsByFile.get(pathKey) ?? []
    if (!items.some(item => item.id === testId)) {
      items.push({ id: testId, line: testLine })
      items.sort((a, b) => a.line - b.line)
      testsByFile.set(pathKey, items)
    }
  }

  const resolveErrorSource = (params: any): { url?: string, line?: number, column?: number } => {
    const urls: string[] = Array.isArray(params?.urls) ? params.urls : []
    const lineColumns: number[] = Array.isArray(params?.lineColumns) ? params.lineColumns : []

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      if (!url)
        continue

      const line = Number(lineColumns[i * 2] ?? 0)
      const column = Number(lineColumns[i * 2 + 1] ?? 0)

      return {
        url,
        line: line > 0 ? line : undefined,
        column: column > 0 ? column : undefined,
      }
    }

    return {}
  }

  const resolveTestIdFromSource = (url?: string, line?: number): number | null => {
    const pathKey = toPathKey(url)
    if (!pathKey)
      return null

    const candidates = testsByFile.get(pathKey)
    if (!candidates?.length)
      return null

    if (!line || line <= 0)
      return candidates[candidates.length - 1]!.id

    let bestCandidate: { id: number, line: number } | null = null

    for (const candidate of candidates) {
      if (candidate.line <= line && (!bestCandidate || candidate.line >= bestCandidate.line))
        bestCandidate = candidate
    }

    return (bestCandidate ?? candidates[candidates.length - 1])?.id ?? null
  }

  inspector.on('TestReporter.found', (params: any) => {
    if (!isRunActive(runId))
      return

    indexFoundTest(params)
    broadcastRun(runId, { type: 'found', data: params })
  })

  inspector.on('TestReporter.start', (params: any) => {
    if (!isRunActive(runId))
      return

    currentTestId = typeof params?.id === 'number' ? params.id : Number(params?.id)
    if (!Number.isFinite(currentTestId))
      currentTestId = null

    broadcastRun(runId, { type: 'start', data: params })
  })

  inspector.on('TestReporter.end', (params: any) => {
    if (!isRunActive(runId))
      return

    const endedId = typeof params?.id === 'number' ? params.id : Number(params?.id)
    if (currentTestId != null && Number.isFinite(endedId) && currentTestId === endedId)
      currentTestId = null

    broadcastRun(runId, { type: 'end', data: params })
  })

  inspector.on('Runtime.consoleAPICalled', (params: any) => {
    if (!isRunActive(runId))
      return

    broadcastRun(runId, { type: 'console', data: params })
  })

  inspector.on('LifecycleReporter.error', (params: any) => {
    if (!isRunActive(runId))
      return

    const urls: string[] = Array.isArray(params?.urls) ? params.urls : []
    const lineColumns: number[] = Array.isArray(params?.lineColumns) ? params.lineColumns : []

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

    const source = resolveErrorSource(params)
    const resolvedTestId = currentTestId ?? resolveTestIdFromSource(source.url, source.line)

    const errorName = params?.name ?? 'Error'
    const rawMessage = params?.message ?? 'Unknown error'
    const stackTrace = stackLines.length > 0 ? `\n\n${stackLines.join('\n')}` : ''
    const errorMessage = `${errorName}: ${rawMessage}${stackTrace}`

    broadcastRun(runId, {
      type: 'error',
      data: {
        testId: resolvedTestId,
        message: errorMessage,
        source,
      },
    })
  })

  let inspectorConnecting = false
  let inspectorReady = false
  const tryConnectInspector = async () => {
    if (!isRunActive(runId) || connectState.closed || inspectorReady || inspectorConnecting)
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
      setTimeout(() => {
        void tryConnectInspector()
      }, 300)
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

  signal.on('Signal.Socket.connect', () => {
    void tryConnectInspector()
  })
  signal.on('Signal.received', () => {
    void tryConnectInspector()
  })
  signal.on('Signal.error', error => log.debug('Inspector signal error', error))

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

  if (COVERAGE_ENABLED)
    testCmd.push('--coverage', '--coverage-reporter=text', '--coverage-reporter=lcov', '--coverage-dir', COVERAGE_DIR)

  const child = spawn({
    cmd: testCmd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      BUN_INSPECT: `${inspectorUrl}?wait=1`,
      BUN_INSPECT_NOTIFY: signal.url,
    },
  })

  state.process = child

  child.exited?.then(async (code) => {
    connectState.closed = true

    const coverage = await readCoverageReport()
    broadcastRun(runId, { type: 'coverage', data: coverage })
    broadcastRun(runId, { type: 'exit', code })

    if (state.process === child)
      state.process = null

    if (state.inspector === inspector) {
      state.inspector = null
      inspector.close()
    }

    if (state.signal === signal) {
      state.signal = null
      signal.close()
    }
  }).catch((error) => {
    log.debug('Test process exit handler failed', error)
  })

  async function streamOutput(reader: ReadableStreamDefaultReader<Uint8Array>, type: 'stdout' | 'stderr') {
    const decoder = new TextDecoder()
    const output = type === 'stdout' ? process.stdout : process.stderr

    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break

      const text = decoder.decode(value)
      output.write(text)
      broadcastRun(runId, { type: 'output', stream: type, data: text })
    }
  }

  if (child.stdout && typeof child.stdout !== 'number')
    streamOutput(child.stdout.getReader(), 'stdout').catch(() => {})
  if (child.stderr && typeof child.stderr !== 'number')
    streamOutput(child.stderr.getReader(), 'stderr').catch(() => {})
}

function queueTestRun(request?: RunRequest) {
  const runId = ++nextRunId

  runStartQueue = runStartQueue
    .catch(() => {})
    .then(() => startTestRun(runId, request))
    .catch((error) => {
      log.error('Failed to start test run:', error)
      if (state.activeRunId === runId) {
        broadcast({
          type: 'run-start',
          runId,
          requestId: request?.requestId ?? null,
          filtered: Boolean(request?.files?.length || request?.testNamePattern),
          coverageEnabled: COVERAGE_ENABLED,
          coverageDir: COVERAGE_DIR,
        })
        broadcast({ type: 'coverage', runId, data: null })
        broadcast({ type: 'exit', code: 1, runId })
      }
    })
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
          const requestId = typeof data.requestId === 'number' && Number.isInteger(data.requestId)
            ? data.requestId
            : undefined

          queueTestRun({ files, testNamePattern, requestId })
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
    const coverageRoot = COVERAGE_DIR.split(/[\\/]/).filter(Boolean)[0]
    if (coverageRoot)
      ignored.add(coverageRoot)

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
