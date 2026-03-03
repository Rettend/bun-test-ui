import type { TestNode } from '../../../src/client/components/types'
import { describe, expect, test } from 'bun:test'
import {
  formatTimestamp,
  getAggregateStatus,
  getStatusBadgeClass,
  getStatusDotClass,
  stringifyArg,
} from '../../../src/client/components/utils'

function createNode(node: Partial<TestNode> & Pick<TestNode, 'id' | 'name' | 'type' | 'status'>): TestNode {
  return {
    children: [],
    ...node,
  }
}

describe('getStatusDotClass', () => {
  test('maps status to expected dot class', () => {
    expect(getStatusDotClass('passed')).toContain('bg-emerald-400')
    expect(getStatusDotClass('failed')).toContain('bg-red-400')
    expect(getStatusDotClass('running')).toContain('animate-pulse')
    expect(getStatusDotClass('skipped')).toContain('bg-gray-500')
    expect(getStatusDotClass('todo')).toContain('bg-gray-500')
    expect(getStatusDotClass('timeout')).toContain('bg-orange-400')
  })

  test('falls back for unknown status values', () => {
    expect(getStatusDotClass('other' as any)).toContain('bg-gray-600')
  })
})

describe('getStatusBadgeClass', () => {
  test('maps status to expected badge class', () => {
    expect(getStatusBadgeClass('passed')).toContain('text-emerald-300')
    expect(getStatusBadgeClass('failed')).toContain('text-red-300')
    expect(getStatusBadgeClass('running')).toContain('text-amber-200')
    expect(getStatusBadgeClass('skipped')).toContain('text-gray-400')
    expect(getStatusBadgeClass('todo')).toContain('text-gray-400')
    expect(getStatusBadgeClass('timeout')).toContain('text-orange-300')
  })

  test('falls back for unknown status values', () => {
    expect(getStatusBadgeClass('other' as any)).toContain('text-gray-400')
  })
})

describe('stringifyArg', () => {
  test('returns stack or message for error values', () => {
    const error = new Error('boom')
    error.stack = 'Error: boom\n    at demo:1:1'
    expect(stringifyArg(error)).toContain('Error: boom')
  })

  test('handles primitive values', () => {
    expect(stringifyArg('hello')).toBe('hello')
    expect(stringifyArg(42)).toBe('42')
    expect(stringifyArg(false)).toBe('false')
    expect(stringifyArg(null)).toBe('null')
    expect(stringifyArg(undefined)).toBe('undefined')
  })

  test('pretty-prints object values', () => {
    expect(stringifyArg({ ok: true })).toBe('{\n  "ok": true\n}')
  })

  test('falls back to String for circular objects', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(stringifyArg(circular)).toBe('[object Object]')
  })
})

describe('formatTimestamp', () => {
  test('formats timestamp into a readable time string', () => {
    expect(formatTimestamp(0).length).toBeGreaterThan(0)
  })
})

describe('getAggregateStatus', () => {
  test('returns the status for test nodes', () => {
    const testNode = createNode({ id: 't1', name: 'test', type: 'test', status: 'failed' })
    expect(getAggregateStatus(testNode, { t1: testNode })).toBe('failed')
  })

  test('returns running when any child is running', () => {
    const store: Record<string, TestNode> = {
      root: createNode({ id: 'root', name: 'root', type: 'describe', status: 'idle', children: ['a', 'b'] }),
      a: createNode({ id: 'a', name: 'a', type: 'test', status: 'passed' }),
      b: createNode({ id: 'b', name: 'b', type: 'test', status: 'running' }),
    }

    expect(getAggregateStatus(store.root!, store)).toBe('running')
  })

  test('returns failed when any child failed or timed out', () => {
    const store: Record<string, TestNode> = {
      root: createNode({ id: 'root', name: 'root', type: 'describe', status: 'idle', children: ['a', 'b'] }),
      a: createNode({ id: 'a', name: 'a', type: 'test', status: 'timeout' }),
      b: createNode({ id: 'b', name: 'b', type: 'test', status: 'skipped' }),
    }

    expect(getAggregateStatus(store.root!, store)).toBe('failed')
  })

  test('returns passed when at least one child passed and rest were skipped', () => {
    const store: Record<string, TestNode> = {
      root: createNode({ id: 'root', name: 'root', type: 'describe', status: 'idle', children: ['a', 'b'] }),
      a: createNode({ id: 'a', name: 'a', type: 'test', status: 'passed' }),
      b: createNode({ id: 'b', name: 'b', type: 'test', status: 'todo' }),
    }

    expect(getAggregateStatus(store.root!, store)).toBe('passed')
  })

  test('returns skipped when all children were skipped/todo', () => {
    const store: Record<string, TestNode> = {
      root: createNode({ id: 'root', name: 'root', type: 'describe', status: 'idle', children: ['a', 'b'] }),
      a: createNode({ id: 'a', name: 'a', type: 'test', status: 'skipped' }),
      b: createNode({ id: 'b', name: 'b', type: 'test', status: 'todo' }),
    }

    expect(getAggregateStatus(store.root!, store)).toBe('skipped')
  })

  test('returns idle for mixed unresolved states', () => {
    const store: Record<string, TestNode> = {
      root: createNode({ id: 'root', name: 'root', type: 'describe', status: 'idle', children: ['a'] }),
      a: createNode({ id: 'a', name: 'a', type: 'test', status: 'idle' }),
    }

    expect(getAggregateStatus(store.root!, store)).toBe('idle')
  })
})
