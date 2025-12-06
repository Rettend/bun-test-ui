import { rm } from 'node:fs/promises'
import Bun from 'bun'
import { SolidPlugin } from 'bun-plugin-solid'
import UnoCSSPlugin from './plugins/unocss-bun-plugin'

await rm('./dist/client', { recursive: true, force: true }).catch(() => {})

await Bun.build({
  entrypoints: ['./src/client/index.html'],
  outdir: './dist/client',
  plugins: [
    SolidPlugin(),
    UnoCSSPlugin,
  ],
})
