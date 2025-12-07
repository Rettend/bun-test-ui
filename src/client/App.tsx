import type { Component } from 'solid-js'
import type { ConnectionStatus, ConsoleEntry, ConsolePayload, RunPhase, TestNode, TestStatus } from './components'
import { createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { ConsolePanel, Header, ProgressBar, SplitPane, stringifyArg, SummaryBar, TestDetails, TestExplorer } from './components'
import { buildTestNamePattern, coerceElapsed, normalizeFilePath } from './utils/run'

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
  const inspectorIdMap: Map<string, string> = new Map()
  let isFilteredRun = false
  const targetedTestIds: Set<string> = new Set()

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

  interface RunOptions {
    files?: string[]
    testNamePattern?: string
    /**
     * When false, we keep the existing tree and only reset targeted tests.
     * Defaults to true when no filters are provided.
     */
    resetState?: boolean
    /**
     * Leaf test ids we are about to run; used to reset status/duration/error.
     */
    targetIds?: string[]
  }

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
        const inspectorId = String(id)
        const inspectorParentId = parentId != null ? String(parentId) : undefined

        if (isFilteredRun) {
          // During filtered runs, try to find existing node by path
          const parentStableId = inspectorParentId ? inspectorIdMap.get(inspectorParentId) : undefined
          const stableId = findExistingNodeId(name, type, url, parentStableId)

          if (stableId) {
            // Map inspector ID to existing stable ID
            inspectorIdMap.set(inspectorId, stableId)
            // Update the existing node's metadata if needed
            setTests(stableId as any, node => ({
              ...node,
              url: url ?? node.url,
              line: line ?? node.line,
            }))
          }
          else {
            // Node not found - this shouldn't happen in a well-formed filtered run
            // but handle gracefully by creating a new node
            inspectorIdMap.set(inspectorId, inspectorId)
            createNewNode(inspectorId, name, type, url, line, parentStableId)
          }
        }
        else {
          // Full run: use inspector IDs as stable IDs
          inspectorIdMap.set(inspectorId, inspectorId)
          const parentNodeId = inspectorParentId
          createNewNode(inspectorId, name, type, url, line, parentNodeId)
        }
        break
      }
      case 'start': {
        ensureRunTimer()
        const { id } = msg.data
        const inspectorId = String(id)
        const stableId = inspectorIdMap.get(inspectorId) ?? inspectorId
        activeTestId = stableId

        setTests(stableId as any, test => ({
          ...(test ?? { id: stableId, name: `Test ${stableId}`, type: 'test', status: 'idle', children: [] }),
          status: 'running' as TestStatus,
          startedAt: performance.now(),
        }))
        break
      }
      case 'end': {
        ensureRunTimer()
        const { id, status, elapsed, error } = msg.data
        const inspectorId = String(id)
        const stableId = inspectorIdMap.get(inspectorId) ?? inspectorId
        const existingNode = tests[stableId]

        if (isFilteredRun && existingNode?.type === 'describe')
          break

        const isSkipStatus = status === 'skip' || status === 'skipped_because_label'
        if (isFilteredRun && isSkipStatus && !targetedTestIds.has(stableId))
          break

        const mappedStatus: TestStatus = status === 'pass'
          ? 'passed'
          : status === 'fail'
            ? 'failed'
            : status === 'timeout'
              ? 'timeout'
              : status === 'todo'
                ? 'todo'
                : 'skipped'

        const elapsedNumber = coerceElapsed(elapsed)
        setTests(stableId as any, (test) => {
          // Prefer inspector elapsed when present and > 0; otherwise fallback to client timer
          const duration = elapsedNumber && elapsedNumber > 0
            ? elapsedNumber
            : test?.startedAt
              ? performance.now() - test.startedAt
              : undefined
          return {
            ...(test ?? { id: stableId, name: `Test ${stableId}`, type: 'test', status: 'idle', children: [] }),
            status: mappedStatus,
            duration,
            error: (error as any)?.message ?? test?.error,
          }
        })

        if (activeTestId === stableId)
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

  function createNewNode(nodeId: string, name: string, type: 'test' | 'describe', url?: string, line?: number, parentId?: string) {
    const addAsRoot = !parentId && !roots().includes(nodeId)

    setTests(produce((state) => {
      if (!state[nodeId])
        state[nodeId] = { id: nodeId, name, type, parentId, url, line, status: 'idle', children: [] }
      else
        state[nodeId] = { ...state[nodeId], name, type, parentId, url, line }

      if (parentId) {
        if (!state[parentId])
          state[parentId] = { id: parentId, name: 'Group', type: 'describe', status: 'idle', children: [] }

        if (!state[parentId].children.includes(nodeId))
          state[parentId].children.push(nodeId)
      }
    }))

    if (addAsRoot)
      setRoots(prev => (prev.includes(nodeId) ? prev : [...prev, nodeId]))
    if (!selectedId())
      setSelectedId(nodeId)
  }

  function findExistingNodeId(name: string, type: string, url?: string, parentStableId?: string): string | undefined {
    const normalizedUrl = normalizeFilePath(url)

    // Search in the appropriate scope
    const searchScope = parentStableId ? tests[parentStableId]?.children ?? [] : roots()

    for (const candidateId of searchScope) {
      const candidate = tests[candidateId]
      if (!candidate)
        continue

      // Match by name and type
      if (candidate.name === name && candidate.type === type) {
        // For root-level nodes, also check file path
        if (!parentStableId) {
          const candidateUrl = normalizeFilePath(candidate.url)
          if (candidateUrl === normalizedUrl)
            return candidateId
        }
        else {
          return candidateId
        }
      }
    }

    return undefined
  }

  function buildTestPath(id: string): string[] | null {
    const path: string[] = []
    let current: TestNode | undefined = tests[id]
    if (!current)
      return null

    while (current) {
      path.unshift(current.name || 'Test')
      if (!current.parentId)
        break
      current = tests[current.parentId]
      if (!current)
        break
    }

    return path
  }

  function collectLeafTests(rootId: string): Array<{ id: string, file?: string, path: string[] }> {
    const root = tests[rootId]
    if (!root)
      return []

    const queue = [root]
    const leafTests: Array<{ id: string, file?: string, path: string[] }> = []

    while (queue.length) {
      const current = queue.pop()!
      if (current.type === 'test') {
        const path = buildTestPath(current.id) ?? [current.name]
        leafTests.push({
          id: current.id,
          file: normalizeFilePath(current.url),
          path,
        })
      }

      for (const childId of current.children)
        tests[childId] && queue.push(tests[childId]!)
    }

    return leafTests
  }

  function runTests(options?: RunOptions) {
    if (!ws || ws.readyState !== WebSocket.OPEN)
      return

    const hasFilter = Boolean(options?.files?.length || options?.testNamePattern)
    const resetState = options?.resetState ?? !hasFilter
    const targetIds = options?.targetIds ?? []

    activeTestId = null
    setConsoleEntries([])
    setPhase('running')
    setRunDuration(0)
    runStartedAt = performance.now()

    // Clear inspector ID mapping and set run mode
    inspectorIdMap.clear()
    isFilteredRun = !resetState

    // Track which tests we're targeting for this filtered run
    targetedTestIds.clear()
    for (const id of targetIds)
      targetedTestIds.add(id)

    if (resetState) {
      setTests({})
      setRoots([])
      setSelectedId(null)
    }
    else if (targetIds.length) {
      setTests(produce((state) => {
        for (const id of targetIds) {
          if (state[id]) {
            state[id].status = 'idle'
            state[id].duration = undefined
            state[id].error = undefined
          }
        }
      }))
    }

    const payload: any = { type: 'run' }
    if (options?.files?.length)
      payload.files = options.files
    if (options?.testNamePattern)
      payload.testNamePattern = options.testNamePattern

    ws.send(JSON.stringify(payload))
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
      <ProgressBar summary={summary()} />
      <Header
        connection={connection()}
        phase={phase()}
        onRunTests={runTests}
      />

      <SummaryBar summary={summary()} />

      <SplitPane
        initialWidth={256}
        minWidth={180}
        maxWidth={500}
        storageKey="test-explorer-width"
        left={(
          <TestExplorer
            roots={roots()}
            tests={tests}
            selectedId={selectedId()}
            onSelect={setSelectedId}
            onRunTest={(id) => {
              const selection = collectLeafTests(id)
              // If we don't have discovered leaf tests yet, fall back to a file-only run
              if (selection.length === 0) {
                const node = tests[id]
                const file = normalizeFilePath(node?.url)
                runTests({
                  files: file ? [file] : undefined,
                  resetState: false,
                  targetIds: node ? [node.id] : [],
                })
                return
              }

              const files = Array.from(new Set(selection.map(test => test.file).filter(Boolean))) as string[]
              const pattern = buildTestNamePattern(selection.map(test => test.path))
              const targetIds = selection.map(test => test.id)

              runTests({
                files: files.length ? files : undefined,
                testNamePattern: pattern,
                resetState: false,
                targetIds,
              })
            }}
            summary={summary()}
          />
        )}
        right={(
          <main class="p-5 bg-#14141b flex-1 overflow-auto space-y-4">
            <TestDetails test={selectedTest()} />
            <ConsolePanel entries={consoleEntries()} />
          </main>
        )}
      />
    </div>
  )
}

export default App
