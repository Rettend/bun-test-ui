import { createServer } from 'node:net'

export function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, () => {
      const port = (server.address() as any).port
      server.close(() => {
        resolve(port)
      })
    })
    server.on('error', reject)
  })
}
