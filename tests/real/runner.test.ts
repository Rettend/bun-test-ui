import type { TestRunner } from '../../src/client/runner'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createRoot } from 'solid-js'
import { createTestRunner } from '../../src/client/runner'

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 3
  static instances: MockWebSocket[] = []

  readonly url: string
  readyState = MockWebSocket.OPEN
  sent: string[] = []

  onopen: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)

    queueMicrotask(() => {
      this.onopen?.(new Event('open'))
    })
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  emitMessage(payload: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(payload) }))
  }
}

let runner: TestRunner
let socket: MockWebSocket
let disposeRoot: (() => void) | null = null
let originalWebSocket: typeof WebSocket | undefined

function parseSent(index: number): any {
  return JSON.parse(socket.sent[index] ?? '{}')
}

function parseLastSent(): any {
  return parseSent(socket.sent.length - 1)
}

beforeEach(async () => {
  originalWebSocket = globalThis.WebSocket
  MockWebSocket.instances.length = 0
  Object.defineProperty(globalThis, 'WebSocket', {
    configurable: true,
    writable: true,
    value: MockWebSocket as unknown as typeof WebSocket,
  })

  runner = createRoot((dispose) => {
    disposeRoot = dispose
    return createTestRunner()
  })

  await Promise.resolve()
  await Promise.resolve()

  const firstSocket = MockWebSocket.instances[0]
  if (!firstSocket)
    throw new Error('mock websocket was not created')

  socket = firstSocket
})

afterEach(() => {
  disposeRoot?.()
  disposeRoot = null
  MockWebSocket.instances.length = 0

  Object.defineProperty(globalThis, 'WebSocket', {
    configurable: true,
    writable: true,
    value: originalWebSocket,
  })
})

describe('createTestRunner', () => {
  test('connects over websocket and requests an initial run', () => {
    expect(runner.connection()).toBe('connected')
    expect(socket.url.endsWith('/ws')).toBe(true)

    const initialRun = parseSent(0)
    expect(initialRun.type).toBe('run')
    expect(typeof initialRun.requestId).toBe('number')
  })

  test('ignores run-start messages with the wrong request id', () => {
    const initialRun = parseSent(0)

    socket.emitMessage({
      type: 'run-start',
      runId: 1,
      requestId: initialRun.requestId + 100,
      coverageEnabled: true,
      coverageDir: 'coverage-mismatch',
    })

    expect(runner.coverageEnabled()).toBe(false)
    expect(runner.coverageDir()).toBe('coverage')

    socket.emitMessage({
      type: 'run-start',
      runId: 1,
      requestId: initialRun.requestId,
      coverageEnabled: true,
      coverageDir: 'coverage-ok',
    })

    expect(runner.coverageEnabled()).toBe(true)
    expect(runner.coverageDir()).toBe('coverage-ok')
  })

  test('updates test nodes and summary from run lifecycle messages', async () => {
    const initialRun = parseSent(0)

    socket.emitMessage({
      type: 'run-start',
      runId: 10,
      requestId: initialRun.requestId,
      filtered: false,
      coverageEnabled: true,
      coverageDir: 'coverage',
    })
    socket.emitMessage({
      type: 'found',
      runId: 10,
      data: {
        id: 100,
        name: 'math.test.ts',
        type: 'describe',
        url: 'file:///tmp/math.test.ts',
      },
    })
    socket.emitMessage({
      type: 'found',
      runId: 10,
      data: {
        id: 101,
        name: 'adds numbers',
        type: 'test',
        parentId: 100,
        url: 'file:///tmp/math.test.ts',
        line: 8,
      },
    })
    socket.emitMessage({
      type: 'start',
      runId: 10,
      data: { id: 101 },
    })
    socket.emitMessage({
      type: 'end',
      runId: 10,
      data: {
        id: 101,
        status: 'pass',
        elapsed: 2_000_000,
      },
    })
    socket.emitMessage({
      type: 'coverage',
      runId: 10,
      data: {
        enabled: true,
        dir: 'coverage',
        totals: {
          lines: { covered: 4, total: 5, pct: 80 },
          functions: { covered: 2, total: 2, pct: 100 },
          branches: { covered: 3, total: 4, pct: 75 },
        },
        files: [],
      },
    })
    socket.emitMessage({
      type: 'exit',
      runId: 10,
      code: 0,
    })

    await Promise.resolve()

    expect(runner.tests['101']?.status).toBe('passed')
    expect(runner.tests['101']?.duration).toBe(2)
    expect(runner.tests['101']?.parentId).toBe('100')
    expect(runner.roots()).toEqual(['100'])
    expect(runner.phase()).toBe('done')
    expect(runner.coverage()?.totals.lines.pct).toBe(80)
  })

  test('builds filtered run payload when running a suite', () => {
    const initialRun = parseSent(0)

    socket.emitMessage({
      type: 'run-start',
      runId: 20,
      requestId: initialRun.requestId,
      filtered: false,
    })
    socket.emitMessage({
      type: 'found',
      runId: 20,
      data: {
        id: 200,
        name: 'auth suite',
        type: 'describe',
        url: 'file:///tmp/auth.test.ts',
      },
    })
    socket.emitMessage({
      type: 'found',
      runId: 20,
      data: {
        id: 201,
        name: 'logs in with %i',
        type: 'test',
        parentId: 200,
        url: 'file:///tmp/auth.test.ts',
      },
    })
    socket.emitMessage({
      type: 'exit',
      runId: 20,
      code: 0,
    })

    const sentBefore = socket.sent.length
    runner.runTest('200')
    expect(socket.sent.length).toBe(sentBefore + 1)

    const payload = parseLastSent()
    expect(payload.type).toBe('run')
    expect(payload.files).toEqual(['/tmp/auth.test.ts'])
    expect(payload.testNamePattern).toContain('auth suite logs in with')
    expect(payload.testNamePattern).toContain('.*?')
  })

  test('reruns changed test files and full runs for source changes', () => {
    const initialRun = parseSent(0)

    socket.emitMessage({
      type: 'run-start',
      runId: 30,
      requestId: initialRun.requestId,
      filtered: false,
    })
    socket.emitMessage({
      type: 'found',
      runId: 30,
      data: {
        id: 300,
        name: 'suite',
        type: 'describe',
        url: 'file:///tmp/watch.test.ts',
      },
    })
    socket.emitMessage({
      type: 'found',
      runId: 30,
      data: {
        id: 301,
        name: 'works',
        type: 'test',
        parentId: 300,
        url: 'file:///tmp/watch.test.ts',
      },
    })
    socket.emitMessage({
      type: 'exit',
      runId: 30,
      code: 0,
    })

    const beforeTestFileChange = socket.sent.length
    socket.emitMessage({
      type: 'file-changed',
      data: {
        isTestFile: true,
        fullPath: '/tmp/watch.test.ts',
      },
    })
    expect(socket.sent.length).toBe(beforeTestFileChange + 1)
    expect(parseLastSent().files).toEqual(['/tmp/watch.test.ts'])

    const beforeSourceFileChange = socket.sent.length
    socket.emitMessage({
      type: 'file-changed',
      data: {
        isTestFile: false,
        fullPath: '/tmp/source.ts',
      },
    })
    expect(socket.sent.length).toBe(beforeSourceFileChange + 1)
    expect(parseLastSent().files).toBeUndefined()
  })

  test('attributes console messages to the nearest test by source', () => {
    const initialRun = parseSent(0)

    socket.emitMessage({
      type: 'run-start',
      runId: 40,
      requestId: initialRun.requestId,
      filtered: false,
    })
    socket.emitMessage({
      type: 'found',
      runId: 40,
      data: {
        id: 400,
        name: 'suite',
        type: 'describe',
        url: 'file:///tmp/console.test.ts',
      },
    })
    socket.emitMessage({
      type: 'found',
      runId: 40,
      data: {
        id: 401,
        name: 'logs message',
        type: 'test',
        parentId: 400,
        url: 'file:///tmp/console.test.ts',
        line: 10,
      },
    })
    socket.emitMessage({
      type: 'console',
      runId: 40,
      data: {
        type: 'log',
        args: ['hello', { ok: true }],
        timestamp: 123,
        stackTrace: {
          callFrames: [
            {
              url: 'file:///tmp/console.test.ts',
              lineNumber: 12,
              columnNumber: 2,
            },
          ],
        },
      },
    })

    const [entry] = runner.consoleEntries()
    expect(entry?.level).toBe('log')
    expect(entry?.message).toContain('hello')
    expect(entry?.message).toContain('"ok": true')
    expect(entry?.testId).toBe('401')
    expect(entry?.source).toBe('/tmp/console.test.ts:13:3')
  })
})
