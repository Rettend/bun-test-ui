import { createServer } from 'node:net'
import { describe, expect, test } from 'bun:test'
import { getFreePort } from '../../../src/server/utils/server'

describe('getFreePort', () => {
  test('returns an available tcp port', async () => {
    const port = await getFreePort()

    expect(Number.isInteger(port)).toBe(true)
    expect(port).toBeGreaterThan(0)

    const server = createServer()
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, '127.0.0.1', () => resolve())
    })

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error)
          reject(error)
        else
          resolve()
      })
    })
  })

  test('can allocate multiple distinct ports', async () => {
    const first = await getFreePort()
    const second = await getFreePort()
    expect(first).not.toBe(second)
  })
})
