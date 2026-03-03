import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'
import { getTestConfig } from '../../src/config'

const tmpDirs: string[] = []

afterEach(async () => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop()
    if (dir)
      await rm(dir, { recursive: true, force: true })
  }
})

async function createTempProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'bun-test-ui-config-'))
  tmpDirs.push(dir)
  return dir
}

describe('getTestConfig', () => {
  test('returns defaults when no bunfig.toml exists', async () => {
    const cwd = await createTempProject()
    const config = getTestConfig({ cwd })

    expect(config).toEqual({
      port: 51205,
      testRoot: '',
      testPattern: '',
      open: true,
      cwd,
      watch: true,
      preload: [],
      coverage: true,
      coverageDir: 'coverage',
    })
  })

  test('reads values from bunfig.toml', async () => {
    const cwd = await createTempProject()
    await writeFile(join(cwd, 'bunfig.toml'), `[test]\nroot = "./spec"\npreload = ["./setup/dom.ts", "./setup/env.ts"]\ncoverage = false\ncoverageDir = "./custom-coverage"\n`)

    const config = getTestConfig({ cwd })

    expect(config.testRoot).toBe('./spec')
    expect(config.preload).toEqual(['./setup/dom.ts', './setup/env.ts'])
    expect(config.coverage).toBe(false)
    expect(config.coverageDir).toBe('./custom-coverage')
  })

  test('ignores invalid bunfig.toml content', async () => {
    const cwd = await createTempProject()
    await writeFile(join(cwd, 'bunfig.toml'), `[test\nroot = "./broken"`)

    const config = getTestConfig({ cwd })

    expect(config.testRoot).toBe('')
    expect(config.preload).toEqual([])
    expect(config.coverage).toBe(true)
  })

  test('options override bunfig values', async () => {
    const cwd = await createTempProject()
    await writeFile(join(cwd, 'bunfig.toml'), `[test]\nroot = "./spec"\npreload = ["./setup/dom.ts"]\ncoverage = false\ncoverageDir = "./custom-coverage"\n`)

    const config = getTestConfig({
      cwd,
      port: 61000,
      testRoot: './tests/real',
      testPattern: 'runner',
      open: false,
      watch: false,
      preload: ['./manual.ts'],
      coverage: true,
      coverageDir: './coverage-manual',
    })

    expect(config).toEqual({
      port: 61000,
      testRoot: './tests/real',
      testPattern: 'runner',
      open: false,
      cwd,
      watch: false,
      preload: ['./manual.ts'],
      coverage: true,
      coverageDir: './coverage-manual',
    })
  })
})
