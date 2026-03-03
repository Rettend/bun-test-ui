import { plugin } from 'bun'
import { SolidPlugin } from 'bun-plugin-solid'

plugin({
  name: 'solid-web-client-runtime',
  setup(build) {
    build.onLoad({ filter: /[\\/]solid-js[\\/]web[\\/]dist[\\/](web|dev)\.js$/ }, async ({ path }) => {
      const source = await Bun.file(path).text()
      return {
        contents: source.replaceAll(`from 'solid-js'`, `from 'solid-js/dist/solid.js'`),
        loader: 'js',
      }
    })
  },
})

plugin(SolidPlugin({ moduleName: 'solid-js/web/dist/web.js' }))
