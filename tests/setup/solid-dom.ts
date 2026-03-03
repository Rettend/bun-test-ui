import { plugin } from 'bun'
import { SolidPlugin } from 'bun-plugin-solid'

plugin(SolidPlugin({ moduleName: 'solid-js/web/dist/web.js' }))
