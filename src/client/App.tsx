import type { Component } from 'solid-js'
import type { ConnectionStatus, ConsoleEntry, ConsolePayload, RunPhase, TestNode, TestStatus } from './components'
import { createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { ConsolePanel, Header, stringifyArg, SummaryBar, TestDetails, TestExplorer } from './components'

const App: Component = () => {
  const [tests, setTests] = createStore<Record<string, TestNode>>({})
  const [roots, setRoots] = createSignal<string[]>([])
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [consoleEntries, setConsoleEntries] = createSignal<ConsoleEntry[]>([])
  const [connection, setConnection] = createSignal<ConnectionStatus>('connecting')
  const [phase, setPhase] = createSignal<RunPhase>('idle')
  const [runDuration, setRunDuration] = createSignal(0)

  let ws: WebSocket | null = null
  let consoleId = 0
  let runStartedAt = 0
  let activeTestId: string | null = null

  onMount(() => {
    connectWebSocket()
  })

  onCleanup(() => ws?.close())

  createEffect(() => {
    if (phase() !== 'running')
      return
    const all = Object.values(tests)
    if (all.length > 0 && all.every(test => test.status !== 'running' && test.status !== 'idle')) {
      setPhase('done')
      if (runStartedAt) {
        setRunDuration(performance.now() - runStartedAt)
        runStartedAt = 0
      }
    }
  })

  const summary = createMemo(() => {
    const all = Object.values(tests)
    const passed = all.filter(t => t.status === 'passed').length
    const failed = all.filter(t => t.status === 'failed' || t.status === 'timeout').length
    const skipped = all.filter(t => t.status === 'skipped' || t.status === 'todo').length
    const running = all.filter(t => t.status === 'running').length
    const duration = runDuration() || (runStartedAt ? performance.now() - runStartedAt : 0)
    return {
      total: all.length,
      passed,
      failed,
      skipped,
      running,
      duration,
    }
  })

  const selectedTest = createMemo(() => (selectedId() ? tests[selectedId()!] : undefined))

  function connectWebSocket() {
    setConnection('connecting')
    ws = new WebSocket(`ws://${location.host}/ws`)
    ws.onopen = () => {
      setConnection('connected')
      runTests()
    }
    ws.onerror = () => setConnection('disconnected')
    ws.onclose = () => setConnection('disconnected')
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      handleMessage(msg)
    }
  }

  function ensureRunTimer() {
    if (!runStartedAt) {
      runStartedAt = performance.now()
      setPhase('running')
    }
  }

  function handleMessage(msg: any) {
    switch (msg.type) {
      case 'found': {
        ensureRunTimer()
        const { id, name, type, parentId, url, line } = msg.data
        const nodeId = String(id)
        const parent = parentId != null ? String(parentId) : undefined
        const addAsRoot = !parent && !roots().includes(nodeId)

        setTests(produce((state) => {
          if (!state[nodeId])
            state[nodeId] = { id: nodeId, name, type, parentId: parent, url, line, status: 'idle', children: [] }

          else
            state[nodeId] = { ...state[nodeId], name, type, parentId: parent, url, line }

          if (parent) {
            if (!state[parent])
              state[parent] = { id: parent, name: 'Group', type: 'describe', status: 'idle', children: [] }

            if (!state[parent].children.includes(nodeId))
              state[parent].children.push(nodeId)
          }
        }))

        if (addAsRoot)
          setRoots(prev => (prev.includes(nodeId) ? prev : [...prev, nodeId]))
        if (!selectedId())
          setSelectedId(nodeId)
        break
      }
      case 'start': {
        ensureRunTimer()
        const { id } = msg.data
        const nodeId = String(id)
        activeTestId = nodeId
        setTests(nodeId as any, test => ({
          ...(test ?? { id: nodeId, name: `Test ${nodeId}`, type: 'test', status: 'idle', children: [] }),
          status: 'running' as TestStatus,
          startedAt: performance.now(),
        }))
        break
      }
      case 'end': {
        ensureRunTimer()
        const { id, status, elapsed, error } = msg.data
        const nodeId = String(id)
        const mappedStatus: TestStatus = status === 'pass'
          ? 'passed'
          : status === 'fail'
            ? 'failed'
            : status === 'timeout'
              ? 'timeout'
              : status === 'todo'
                ? 'todo'
                : 'skipped'

        setTests(nodeId as any, (test) => {
          const duration = typeof elapsed === 'number'
            ? elapsed
            : test?.startedAt
              ? performance.now() - test.startedAt
              : undefined
          return {
            ...(test ?? { id: nodeId, name: `Test ${nodeId}`, type: 'test', status: 'idle', children: [] }),
            status: mappedStatus,
            duration,
            error: (error as any)?.message ?? test?.error,
          }
        })

        if (activeTestId === nodeId)
          activeTestId = null
        break
      }
      case 'output': {
        break
      }
      case 'console': {
        handleConsole(msg.data as ConsolePayload)
        break
      }
      case 'exit': {
        if (runStartedAt) {
          setRunDuration(performance.now() - runStartedAt)
          runStartedAt = 0
        }
        activeTestId = null
        setPhase('done')
        break
      }
    }
  }

  function runTests() {
    if (!ws || ws.readyState !== WebSocket.OPEN)
      return
    setTests({})
    setRoots([])
    setSelectedId(null)
    setConsoleEntries([])
    setPhase('running')
    setRunDuration(0)
    runStartedAt = performance.now()
    ws.send(JSON.stringify({ type: 'run' }))
  }

  function handleConsole(payload: ConsolePayload) {
    const args = Array.isArray(payload?.args) ? payload.args : []
    const message = args.length
      ? args.map(arg => stringifyArg(arg)).join(' ')
      : payload?.type ?? 'log'

    const frame = payload?.stackTrace?.callFrames?.[0]
    const source = frame
      ? `${frame.url ?? 'unknown'}:${(frame.lineNumber ?? 0) + 1}:${(frame.columnNumber ?? 0) + 1}`
      : undefined

    const entry: ConsoleEntry = {
      id: ++consoleId,
      level: payload?.type ?? 'log',
      message,
      timestamp: payload?.timestamp ?? Date.now(),
      testId: activeTestId ?? undefined,
      source,
    }

    setConsoleEntries(prev => [...prev, entry].slice(-200))
  }

  return (
    <div class="text-gray-400 font-sans bg-#14141b flex flex-col h-screen antialiased">
      <Header
        connection={connection()}
        phase={phase()}
        onRunTests={runTests}
      />

      <SummaryBar summary={summary()} />

      <div class="flex flex-1 overflow-hidden">
        <TestExplorer
          roots={roots()}
          tests={tests}
          selectedId={selectedId()}
          onSelect={setSelectedId}
          summary={summary()}
        />

        <main class="p-5 bg-#14141b flex-1 overflow-auto space-y-4">
          <TestDetails test={selectedTest()} />
          <ConsolePanel entries={consoleEntries()} />
        </main>
      </div>
    </div>
  )
}

export default App
