import { fileURLToPath } from 'node:url'
import { plugin } from 'bun'
import { SolidPlugin } from 'bun-plugin-solid'

const solidClientPath = fileURLToPath(import.meta.resolve('solid-js/dist/solid.js'))
const solidWebClientPath = fileURLToPath(import.meta.resolve('solid-js/web/dist/web.js'))

async function loadWebClientSource() {
  const source = await Bun.file(solidWebClientPath).text()
  return source.replaceAll(`from 'solid-js'`, `from 'solid-js/dist/solid.js'`)
}

plugin({
  name: 'solid-web-client-runtime',
  setup(build) {
    build.onLoad({ filter: /[\\/]solid-js[\\/]dist[\\/]server\.(js|cjs)$/ }, async () => {
      return {
        contents: await Bun.file(solidClientPath).text(),
        loader: 'js',
      }
    })

    build.onLoad({ filter: /[\\/]solid-js[\\/]web[\\/]dist[\\/]server\.(js|cjs)$/ }, async () => {
      return {
        contents: await loadWebClientSource(),
        loader: 'js',
      }
    })

    build.onLoad({ filter: /[\\/]solid-js[\\/]web[\\/]dist[\\/](web|dev)\.js$/ }, async ({ path }) => {
      const source = await Bun.file(path).text()
      return {
        contents: source.replaceAll(`from 'solid-js'`, `from 'solid-js/dist/solid.js'`),
        loader: 'js',
      }
    })
  },
})

plugin(SolidPlugin())
