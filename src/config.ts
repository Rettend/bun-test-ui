import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

interface BunTestConfig {
  root?: string
  preload?: string[]
  coverage?: boolean
  timeout?: number
}

interface BunConfig {
  test?: BunTestConfig
}

function parseBunfig(cwd: string): BunConfig {
  const bunfigPath = join(cwd, 'bunfig.toml')

  if (!existsSync(bunfigPath))
    return {}

  try {
    const content = readFileSync(bunfigPath, 'utf-8')

    return Bun.TOML.parse(content)
  }
  catch {
    return {}
  }
}

export interface TestUIConfig {
  port?: number
  testRoot?: string
  testPattern?: string
  open?: boolean
  cwd?: string
  watch?: boolean
  preload?: string[]
}

export function getTestConfig(options: TestUIConfig = {}): Required<TestUIConfig> {
  const cwd = options.cwd ?? process.cwd()
  const bunfig = parseBunfig(cwd)

  return {
    port: options.port ?? 51205,
    testRoot: options.testRoot ?? bunfig.test?.root ?? '',
    testPattern: options.testPattern ?? '',
    open: options.open ?? true,
    cwd,
    watch: options.watch ?? true,
    preload: options.preload ?? bunfig.test?.preload ?? [],
  }
}
