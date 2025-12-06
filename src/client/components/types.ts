export type TestStatus = 'idle' | 'running' | 'passed' | 'failed' | 'skipped' | 'todo' | 'timeout'
export type RunPhase = 'idle' | 'running' | 'done'
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface TestNode {
  id: string
  name: string
  type: 'test' | 'describe'
  parentId?: string
  url?: string
  line?: number
  status: TestStatus
  duration?: number
  error?: string
  children: string[]
  startedAt?: number
}

export interface ConsoleEntry {
  id: number
  level: string
  message: string
  timestamp: number
  testId?: string
  source?: string
}

export interface ConsolePayload {
  args?: unknown[]
  type?: string
  timestamp?: number
  stackTrace?: {
    callFrames?: Array<{
      url?: string
      lineNumber?: number
      columnNumber?: number
      functionName?: string
    }>
  }
}

export interface TestSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  running: number
  duration: number
}
