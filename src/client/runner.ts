import type { Accessor } from 'solid-js/dist/solid.js'
import type { Store } from 'solid-js/store'
import type {
  ConnectionStatus,
  ConsoleEntry,
  ConsolePayload,
  CoverageReport,
  RunPhase,
  TestNode,
  TestStatus,
  TestSummary,
} from '~/components'
import { createMemo, createSignal, onCleanup, onMount } from 'solid-js/dist/solid.js'
import { createStore, produce } from 'solid-js/store'
import { stringifyArg } from '~/components'
import { buildTestNamePattern, coerceElapsed, normalizeFilePath } from '~/utils/run'

export interface RunOptions {
  files?: string[]
  testNamePattern?: string
  resetState?: boolean
  targetIds?: string[]
}

export interface TestRunner {
  tests: Store<Record<string, TestNode>>
  roots: Accessor<string[]>
  selectedId: Accessor<string | null>
  consoleEntries: Accessor<ConsoleEntry[]>
  connection: Accessor<ConnectionStatus>
  phase: Accessor<RunPhase>
  runDuration: Accessor<number>
  summary: Accessor<TestSummary>
  coverage: Accessor<CoverageReport | null>
  coverageEnabled: Accessor<boolean>
  coverageDir: Accessor<string>
  selectedTest: Accessor<TestNode | undefined>
  setSelectedId: (id: string | null) => void
  runTests: (options?: RunOptions) => void
  runTest: (id: string) => void
  collectLeafTests: (rootId: string) => Array<{ id: string, file?: string, path: string[] }>
}

export function createTestRunner(): TestRunner {
  const [tests, setTests] = createStore<Record<string, TestNode>>({})
  const [roots, setRoots] = createSignal<string[]>([])
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [consoleEntries, setConsoleEntries] = createSignal<ConsoleEntry[]>([])
  const [connection, setConnection] = createSignal<ConnectionStatus>('connecting')
  const [phase, setPhase] = createSignal<RunPhase>('idle')
  const [runDuration, setRunDuration] = createSignal(0)
  const [coverage, setCoverage] = createSignal<CoverageReport | null>(null)
  const [coverageEnabled, setCoverageEnabled] = createSignal(false)
  const [coverageDir, setCoverageDir] = createSignal('coverage')

  let ws: WebSocket | null = null
  let consoleId = 0
  let runStartedAt = 0
  let activeTestId: string | null = null
  let activeRunId: number | null = null
  let nextRequestId = 0
  let pendingRequestId: number | null = null
  let currentRunResetState = true
  const inspectorIdMap = new Map<string, string>()
  const currentRunFoundIds = new Set<string>()
  const currentRunTargetIds = new Set<string>()

  onMount(() => {
    connectWebSocket()
  })

  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      if (!ws)
        connectWebSocket()
    })
  }

  onCleanup(() => ws?.close())

  const summary = createMemo(() => {
    const allTests = Object.values(tests).filter((t): t is TestNode => Boolean(t) && t.type === 'test')
    const passed = allTests.filter(t => t.status === 'passed').length
    const failed = allTests.filter(t => t.status === 'failed' || t.status === 'timeout').length
    const skipped = allTests.filter(t => t.status === 'skipped' || t.status === 'todo').length
    const running = allTests.filter(t => t.status === 'running').length
    const duration = runDuration() || (runStartedAt ? performance.now() - runStartedAt : 0)
    return {
      total: allTests.length,
      passed,
      failed,
      skipped,
      running,
      duration,
    }
  })

  const selectedTest = createMemo(() => (selectedId() ? tests[selectedId()!] : undefined))

  function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN))
      return

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

  const runScopedMessageTypes = new Set([
    'run-start',
    'found',
    'start',
    'end',
    'output',
    'console',
    'error',
    'coverage',
    'exit',
  ])

  function isRunScopedMessage(type: unknown): boolean {
    return typeof type === 'string' && runScopedMessageTypes.has(type)
  }

  function parseRunId(value: unknown): number | null {
    const runId = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(runId) ? runId : null
  }

  function shouldHandleRunMessage(msg: any): boolean {
    const runId = parseRunId(msg?.runId)
    if (runId == null)
      return false

    if (msg?.type === 'run-start') {
      if (pendingRequestId != null) {
        const messageRequestId = typeof msg?.requestId === 'number' ? msg.requestId : Number(msg?.requestId)
        if (!Number.isFinite(messageRequestId) || messageRequestId !== pendingRequestId)
          return false
      }
      return true
    }

    if (pendingRequestId != null)
      return false

    return activeRunId === runId
  }

  function handleMessage(msg: any) {
    if (isRunScopedMessage(msg?.type) && !shouldHandleRunMessage(msg))
      return

    switch (msg.type) {
      case 'run-start': {
        const runId = parseRunId(msg.runId)
        if (runId == null)
          break

        activeRunId = runId
        pendingRequestId = null
        activeTestId = null
        inspectorIdMap.clear()
        currentRunFoundIds.clear()
        setPhase('running')
        setRunDuration(0)
        runStartedAt = performance.now()
        setCoverage(null)
        setCoverageEnabled(Boolean(msg.coverageEnabled))

        if (typeof msg.filtered === 'boolean')
          currentRunResetState = !msg.filtered

        if (typeof msg.coverageDir === 'string' && msg.coverageDir.trim())
          setCoverageDir(msg.coverageDir)

        break
      }
      case 'found': {
        ensureRunTimer()
        const { id, name, type, parentId, url, line } = msg.data
        const inspectorId = String(id)
        const inspectorParentId = parentId != null ? String(parentId) : undefined
        const parentStableId = inspectorParentId
          ? (inspectorIdMap.get(inspectorParentId) ?? (currentRunResetState ? inspectorParentId : undefined))
          : undefined

        let stableId = inspectorId

        if (!currentRunResetState) {
          const existing = findExistingNodeId(name, type, url, parentStableId)
          if (existing)
            stableId = existing
        }

        inspectorIdMap.set(inspectorId, stableId)
        currentRunFoundIds.add(stableId)

        if (tests[stableId]) {
          setTests(stableId as any, node => ({
            ...node,
            name,
            type,
            parentId: parentStableId,
            url: url ?? node.url,
            line: line ?? node.line,
          }))
        }
        else {
          createNewNode(stableId, name, type, url, line, parentStableId)
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
        const isFilteredRun = !currentRunResetState

        if (isFilteredRun && existingNode?.type === 'describe')
          break

        const isSkipStatus = status === 'skip' || status === 'skipped_because_label'
        if (isFilteredRun && isSkipStatus && !currentRunTargetIds.has(stableId))
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
      case 'error': {
        const { testId, message, source } = msg.data ?? {}

        let stableId: string | undefined
        if (testId != null) {
          const inspectorId = String(testId)
          stableId = inspectorIdMap.get(inspectorId) ?? inspectorId
        }

        if (!stableId) {
          stableId = resolveTestIdFromSource(source?.url, source?.line)
            ?? activeTestId
            ?? undefined
        }

        if (!stableId)
          break

        setTests(stableId as any, test => ({
          ...(test ?? { id: stableId!, name: `Test ${stableId}`, type: 'test', status: 'idle', children: [] }),
          error: message ?? test?.error,
        }))

        break
      }
      case 'coverage': {
        setCoverage((msg.data as CoverageReport | null) ?? null)
        break
      }
      case 'exit': {
        if (runStartedAt) {
          setRunDuration(performance.now() - runStartedAt)
          runStartedAt = 0
        }
        activeTestId = null
        activeRunId = null
        pendingRequestId = null
        setPhase('done')

        if (currentRunResetState)
          pruneMissingNodes(currentRunFoundIds)

        currentRunFoundIds.clear()
        currentRunTargetIds.clear()
        break
      }
      case 'file-changed': {
        const data = msg.data ?? {}
        const changedPath = normalizeFilePath(data.fullPath)

        if (data.isTestFile && changedPath) {
          const fileRootId = roots().find((rootId) => {
            const root = tests[rootId]
            return root && normalizeFilePath(root.url) === changedPath
          })

          if (fileRootId) {
            const targetIds = Array.from(collectSubtreeIds([fileRootId]))

            runTests({
              files: changedPath ? [changedPath] : undefined,
              resetState: false,
              targetIds,
            })
          }
          else {
            runTests({
              files: [changedPath],
              resetState: false,
            })
          }
        }
        else {
          runTests()
        }
        break
      }
    }
  }

  function recomputeRoots() {
    const nextRoots: string[] = []

    for (const [id, node] of Object.entries(tests)) {
      if (!node)
        continue

      if (!node.parentId || !tests[node.parentId])
        nextRoots.push(id)
    }

    setRoots(nextRoots)
  }

  function collectSubtreeIds(startIds: string[]): Set<string> {
    const visited = new Set<string>()
    const queue = [...startIds]

    while (queue.length) {
      const id = queue.pop()!
      if (visited.has(id))
        continue

      const node = tests[id]
      if (!node)
        continue

      visited.add(id)

      for (const childId of node.children)
        queue.push(childId)
    }

    return visited
  }

  function resetNodesForRun(options: { resetAll: boolean, targetIds?: string[] }) {
    const resetAll = options.resetAll
    const targetScope = options.targetIds?.length ? collectSubtreeIds(options.targetIds) : null

    setTests(produce((state) => {
      for (const id in state) {
        const node = state[id]
        if (!node)
          continue

        if (node.status === 'running') {
          node.status = 'idle'
          node.startedAt = undefined
        }

        if (!resetAll && targetScope && !targetScope.has(id))
          continue

        if (resetAll || targetScope) {
          node.status = 'idle'
          node.duration = undefined
          node.error = undefined
          node.startedAt = undefined
        }
      }
    }))
  }

  function pruneMissingNodes(foundIds: Set<string>) {
    setTests(produce((state) => {
      for (const id in state) {
        if (!foundIds.has(id))
          delete state[id]
      }

      for (const id in state) {
        const node = state[id]
        if (!node)
          continue

        node.children = node.children.filter(childId => Boolean(state[childId]))
        if (node.parentId && !state[node.parentId])
          node.parentId = undefined
      }
    }))

    const selected = selectedId()
    if (selected && !foundIds.has(selected))
      setSelectedId(null)

    recomputeRoots()
  }

  function resolveTestIdFromSource(url?: string, line?: number): string | undefined {
    const normalizedSource = normalizeFilePath(url)
    if (!normalizedSource)
      return undefined

    const sourceLine = typeof line === 'number' && Number.isFinite(line) ? line : undefined
    const candidates = Object.values(tests).filter((test): test is TestNode => {
      if (!test || test.type !== 'test')
        return false
      return normalizeFilePath(test.url) === normalizedSource
    })

    if (!candidates.length)
      return undefined

    const runningCandidate = candidates.find(test => test.status === 'running')
    if (runningCandidate)
      return runningCandidate.id

    if (sourceLine != null) {
      let bestMatch: TestNode | undefined

      for (const candidate of candidates) {
        if (candidate.line == null || candidate.line > sourceLine)
          continue

        if (!bestMatch || (bestMatch.line ?? 0) < candidate.line)
          bestMatch = candidate
      }

      if (bestMatch)
        return bestMatch.id

      const sortedByDistance = [...candidates].sort((a, b) => {
        const lineA = a.line ?? Number.POSITIVE_INFINITY
        const lineB = b.line ?? Number.POSITIVE_INFINITY
        return Math.abs(lineA - sourceLine) - Math.abs(lineB - sourceLine)
      })

      return sortedByDistance[0]?.id
    }

    return candidates[0]?.id
  }

  function createNewNode(nodeId: string, name: string, type: 'test' | 'describe', url?: string, line?: number, parentId?: string) {
    setTests(produce((state) => {
      const existingNode = state[nodeId]
      const previousParentId = existingNode?.parentId

      if (!state[nodeId]) {
        state[nodeId] = { id: nodeId, name, type, parentId, url, line, status: 'idle', children: [] }
      }
      else {
        const currentNode = existingNode!
        state[nodeId] = {
          ...currentNode,
          name,
          type,
          parentId,
          url: url ?? currentNode.url,
          line: line ?? currentNode.line,
        }
      }

      if (previousParentId && previousParentId !== parentId && state[previousParentId])
        state[previousParentId].children = state[previousParentId].children.filter(childId => childId !== nodeId)

      if (parentId) {
        if (!state[parentId])
          state[parentId] = { id: parentId, name: 'Group', type: 'describe', status: 'idle', children: [] }

        if (!state[parentId].children.includes(nodeId))
          state[parentId].children.push(nodeId)
      }
    }))

    recomputeRoots()
  }

  function findExistingNodeId(name: string, type: string, url?: string, parentStableId?: string): string | undefined {
    const normalizedUrl = normalizeFilePath(url)

    const searchScope = parentStableId ? tests[parentStableId]?.children ?? [] : roots()

    for (const candidateId of searchScope) {
      const candidate = tests[candidateId]
      if (!candidate)
        continue

      if (candidate.name === name && candidate.type === type) {
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
    const requestId = ++nextRequestId

    pendingRequestId = requestId
    activeRunId = null
    currentRunResetState = resetState
    activeTestId = null
    setConsoleEntries([])
    setPhase('running')
    setRunDuration(0)
    runStartedAt = performance.now()
    setCoverage(null)

    inspectorIdMap.clear()
    currentRunFoundIds.clear()
    currentRunTargetIds.clear()
    for (const id of targetIds)
      currentRunTargetIds.add(id)

    resetNodesForRun({
      resetAll: resetState,
      targetIds,
    })

    const payload: any = {
      type: 'run',
      requestId,
    }
    if (options?.files?.length)
      payload.files = options.files
    if (options?.testNamePattern)
      payload.testNamePattern = options.testNamePattern

    ws.send(JSON.stringify(payload))
  }

  function runTest(id: string) {
    const selection = collectLeafTests(id)
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
  }

  function handleConsole(payload: ConsolePayload) {
    const args = Array.isArray(payload?.args) ? payload.args : []
    const message = args.length
      ? args.map(arg => stringifyArg(arg)).join(' ')
      : payload?.type ?? 'log'

    const frame = payload?.stackTrace?.callFrames?.[0]
    const sourceUrl = normalizeFilePath(frame?.url)
    const sourceLine = frame?.lineNumber != null ? frame.lineNumber + 1 : undefined
    const sourceColumn = frame?.columnNumber != null ? frame.columnNumber + 1 : undefined
    const source = frame
      ? `${sourceUrl ?? 'unknown'}:${sourceLine ?? 0}:${sourceColumn ?? 0}`
      : undefined

    const attributedTestId = resolveTestIdFromSource(sourceUrl, sourceLine)
      ?? activeTestId
      ?? undefined

    const entry: ConsoleEntry = {
      id: ++consoleId,
      level: payload?.type ?? 'log',
      message,
      timestamp: payload?.timestamp ?? Date.now(),
      testId: attributedTestId,
      source,
    }

    setConsoleEntries(prev => [...prev, entry].slice(-200))
  }

  return {
    tests,
    roots,
    selectedId,
    consoleEntries,
    connection,
    phase,
    runDuration,
    summary,
    coverage,
    coverageEnabled,
    coverageDir,
    selectedTest,
    setSelectedId,
    runTests,
    runTest,
    collectLeafTests,
  }
}
