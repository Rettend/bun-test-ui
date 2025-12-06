import type { TestStatus } from './types'

export function getStatusDotClass(status: TestStatus): string {
  switch (status) {
    case 'passed':
      return 'bg-emerald-400'
    case 'failed':
      return 'bg-red-400'
    case 'running':
      return 'bg-amber-400 animate-pulse'
    case 'skipped':
    case 'todo':
      return 'bg-gray-500'
    case 'timeout':
      return 'bg-orange-400'
    default:
      return 'bg-gray-600'
  }
}

export function getStatusBadgeClass(status: TestStatus): string {
  switch (status) {
    case 'passed':
      return 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'failed':
      return 'border border-red-500/30 bg-red-500/10 text-red-300'
    case 'running':
      return 'border border-amber-400/30 bg-amber-500/10 text-amber-200'
    case 'skipped':
    case 'todo':
      return 'border border-gray-500/30 bg-gray-500/10 text-gray-400'
    case 'timeout':
      return 'border border-orange-400/30 bg-orange-500/10 text-orange-300'
    default:
      return 'border border-gray-600/30 bg-gray-600/10 text-gray-400'
  }
}

export function formatDuration(value?: number): string {
  return typeof value === 'number' ? `${value.toFixed(2)}ms` : '—'
}

export function formatTimestamp(value: number): string {
  return new Date(value).toLocaleTimeString()
}

export function stringifyArg(arg: unknown): string {
  if (arg instanceof Error)
    return arg.stack ?? arg.message ?? String(arg)
  const type = typeof arg
  if (type === 'string')
    return arg as string
  if (type === 'number' || type === 'boolean' || arg === null || arg === undefined)
    return String(arg)
  try {
    return JSON.stringify(arg, null, 2)
  }
  catch {
    return String(arg)
  }
}
