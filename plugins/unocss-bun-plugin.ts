import type { BunPlugin } from 'bun'
import process from 'node:process'
import { loadConfig } from '@unocss/config'
import { createGenerator } from '@unocss/core'

interface UnoOptions {
  include?: string[]
  minify?: boolean
  virtualModuleId?: string
}

const DEFAULT_INCLUDE = ['src/**/*.{ts,tsx,js,jsx,html}']
const DEFAULT_VIRTUAL_ID = 'virtual:uno.css'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function UnoCSSPlugin(options: UnoOptions = {}): BunPlugin {
  const include = options.include ?? DEFAULT_INCLUDE
  const minify = options.minify ?? process.env.NODE_ENV === 'production'
  const virtualModuleId = options.virtualModuleId ?? DEFAULT_VIRTUAL_ID

  const pattern = include.length === 1 ? include[0]! : `{${include.join(',')}}`
  const glob = new Bun.Glob(pattern)

  let unoPromise: ReturnType<typeof createGenerator> | null = null

  async function getGenerator() {
    if (!unoPromise) {
      const loaded = await loadConfig()
      unoPromise = createGenerator(loaded.config)
    }
    return unoPromise
  }

  return {
    name: 'unocss-bun',
    async setup(build) {
      const uno = await getGenerator()

      build.onResolve({ filter: new RegExp(`^${escapeRegex(virtualModuleId)}$`) }, () => ({
        path: virtualModuleId,
        namespace: 'unocss',
      }))

      build.onLoad({ filter: /.*/, namespace: 'unocss' }, async () => {
        const files: string[] = []
        for await (const file of glob.scan({ cwd: process.cwd() }))
          files.push(file)

        const inputs = await Promise.all(
          files.map(async (file) => {
            try {
              return await Bun.file(file).text()
            }
            catch {
              return ''
            }
          }),
        )

        const { css } = await uno.generate(inputs.join('\n'), { minify })

        return {
          contents: css,
          loader: 'css',
        }
      })
    },
  }
}

export default UnoCSSPlugin()
