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
    const config: BunConfig = {}
    const lines = content.split('\n')
    let currentSection = ''

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed.startsWith('#') || trimmed === '')
        continue

      const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/)
      if (sectionMatch) {
        currentSection = sectionMatch[1]!
        if (currentSection === 'test')
          config.test = {}
        continue
      }

      if (currentSection === 'test' && config.test) {
        const kvMatch = trimmed.match(/^(\w+)\s*=\s*"([^"]*)"$|^(\w+)\s*=\s*(true|false|\d+)$/)
        if (kvMatch) {
          const key = kvMatch[1] ?? kvMatch[3]
          const rawValue = kvMatch[2] ?? kvMatch[4]

          let value: string | boolean | number = rawValue!
          if (rawValue === 'true')
            value = true
          else if (rawValue === 'false')
            value = false
          else if (!Number.isNaN(Number(rawValue)) && kvMatch[4])
            value = Number(rawValue)

          ;(config.test as any)[key!] = value
        }
      }
    }

    return config
  }
  catch (error) {
    console.warn('Failed to parse bunfig.toml:', error)
    return {}
  }
}

export interface TestUIConfig {
  /** Port for the UI server (default: 51205) */
  port?: number
  /** Test root directory (reads from bunfig.toml [test].root if not specified) */
  testRoot?: string
  /** Test pattern/filter to pass to bun test */
  testPattern?: string
  /** Open browser automatically (default: true) */
  open?: boolean
  /** Working directory (default: process.cwd()) */
  cwd?: string
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
  }
}
