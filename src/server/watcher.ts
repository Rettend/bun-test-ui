import type { WatchEventType } from 'node:fs'
import { existsSync, watch } from 'node:fs'
import { join, relative } from 'node:path'
import process from 'node:process'
import { c, log } from './log'

export interface FileWatcher {
  close: () => void
}

export interface FileChangeInfo {
  filename: string
  fullPath: string
  isTestFile: boolean
}

export interface WatchOptions {
  paths: string[]
  onChange: (info: FileChangeInfo) => void
  debounceMs?: number
  cwd?: string
}

function isTestFile(filename: string): boolean {
  return /\.(?:test|spec)\.(?:ts|tsx|js|jsx|mts|mjs|cts|cjs)$/.test(filename)
}

export function createFileWatcher(options: WatchOptions): FileWatcher {
  const cwd = options.cwd ?? process.cwd()
  const debounceMs = options.debounceMs ?? 50
  const watchers: ReturnType<typeof watch>[] = []

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let pendingInfo: FileChangeInfo | null = null

  const createHandler = (fullWatchPath: string) => {
    return (_eventType: WatchEventType, filename: string | null) => {
      if (!filename)
        return

      const fullPath = join(fullWatchPath, filename)
      const info: FileChangeInfo = {
        filename,
        fullPath,
        isTestFile: isTestFile(filename),
      }

      pendingInfo = info
      if (debounceTimer)
        clearTimeout(debounceTimer)

      debounceTimer = setTimeout(() => {
        if (pendingInfo) {
          const prefix = c.cyan('[watch]')
          const action = c.green('Rerun')
          const file = relative(cwd, pendingInfo.fullPath)
          log.info(`${prefix} ${action} ${file}`)
          options.onChange(pendingInfo)
          pendingInfo = null
        }
        debounceTimer = null
      }, debounceMs)
    }
  }

  for (const watchPath of options.paths) {
    const fullPath = join(cwd, watchPath)

    if (!existsSync(fullPath))
      continue

    try {
      const handler = createHandler(fullPath)
      const watcher = watch(fullPath, { recursive: true }, handler)
      watchers.push(watcher)
    }
    catch {
    }
  }

  return {
    close: () => {
      if (debounceTimer)
        clearTimeout(debounceTimer)
      for (const watcher of watchers)
        watcher.close()
    },
  }
}
