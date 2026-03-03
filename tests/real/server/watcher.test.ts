import type { FileChangeInfo } from '../../../src/server/watcher'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, test } from 'bun:test'
import { createFileWatcher } from '../../../src/server/watcher'

const tmpDirs: string[] = []

afterEach(async () => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop()
    if (dir)
      await rm(dir, { recursive: true, force: true })
  }
})

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  tmpDirs.push(dir)
  return dir
}

function waitForChange(changes: FileChangeInfo[], predicate: (change: FileChangeInfo) => boolean, timeoutMs = 2000): Promise<FileChangeInfo> {
  const started = Date.now()

  return new Promise((resolve, reject) => {
    const tick = () => {
      const hit = changes.find(predicate)
      if (hit) {
        resolve(hit)
        return
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(`timed out after ${timeoutMs}ms`))
        return
      }

      setTimeout(tick, 10)
    }

    tick()
  })
}

describe('createFileWatcher', () => {
  test('ignores missing watch paths without crashing', async () => {
    const cwd = await createTempDir('bun-test-ui-watch-missing-')
    const changes: FileChangeInfo[] = []

    const watcher = createFileWatcher({
      cwd,
      paths: ['does-not-exist'],
      onChange: info => changes.push(info),
      debounceMs: 5,
    })

    await Bun.sleep(20)
    watcher.close()

    expect(changes).toEqual([])
  })

  test('reports changed test files', async () => {
    if (process.platform === 'linux')
      return

    const cwd = await createTempDir('bun-test-ui-watch-testfile-')
    const watchDir = join(cwd, 'watched')
    await mkdir(watchDir, { recursive: true })

    const changes: FileChangeInfo[] = []
    const watcher = createFileWatcher({
      cwd,
      paths: ['watched'],
      onChange: info => changes.push(info),
      debounceMs: 20,
    })

    await writeFile(join(watchDir, 'example.test.ts'), 'export const x = 1\n')

    const change = await waitForChange(changes, item => item.filename.includes('example.test.ts'))
    watcher.close()

    expect(change.isTestFile).toBe(true)
    expect(change.fullPath.replace(/\\/g, '/')).toContain('/watched/')
  })

  test('reports changed non-test files', async () => {
    if (process.platform === 'linux')
      return

    const cwd = await createTempDir('bun-test-ui-watch-sourcefile-')
    const watchDir = join(cwd, 'watched')
    await mkdir(watchDir, { recursive: true })

    const changes: FileChangeInfo[] = []
    const watcher = createFileWatcher({
      cwd,
      paths: ['watched'],
      onChange: info => changes.push(info),
      debounceMs: 20,
    })

    await writeFile(join(watchDir, 'feature.ts'), 'export const y = 2\n')

    const change = await waitForChange(changes, item => item.filename.includes('feature.ts'))
    watcher.close()

    expect(change.isTestFile).toBe(false)
  })
})
