import { createConnection } from 'node:net'
import { afterEach, describe, expect, test } from 'bun:test'
import { TCPSocketSignal } from '../../../src/server/signal'
import { getFreePort } from '../../../src/server/utils/server'

const signals: TCPSocketSignal[] = []

afterEach(() => {
  for (const signal of signals)
    signal.close()
  signals.length = 0
})

function waitForEvent<T = void>(register: (resolve: (value: T) => void) => void, timeoutMs = 1000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs)
    register((value) => {
      clearTimeout(timer)
      resolve(value)
    })
  })
}

describe('TCPSocketSignal', () => {
  test('exposes stable url and port values', async () => {
    const port = await getFreePort()
    const signal = new TCPSocketSignal(port)
    signals.push(signal)

    await signal.ready

    expect(signal.port).toBe(port)
    expect(signal.url).toBe(`tcp://127.0.0.1:${port}`)
  })

  test('emits connect, received and socket closed events', async () => {
    const port = await getFreePort()
    const signal = new TCPSocketSignal(port)
    signals.push(signal)

    await signal.ready

    const connected = waitForEvent<void>(resolve => signal.once('Signal.Socket.connect', () => resolve()))
    const received = waitForEvent<string>(resolve => signal.once('Signal.received', payload => resolve(payload)))
    const socketClosed = waitForEvent<void>(resolve => signal.once('Signal.Socket.closed', () => resolve()))

    const socket = createConnection({ host: '127.0.0.1', port })
    await connected

    socket.write('hello-signal')
    expect(await received).toBe('hello-signal')

    socket.end()
    await socketClosed
  })

  test('emits closed event when server closes', async () => {
    const port = await getFreePort()
    const signal = new TCPSocketSignal(port)
    signals.push(signal)

    await signal.ready

    const closed = waitForEvent<void>(resolve => signal.once('Signal.closed', () => resolve()))
    signal.close()
    await closed
  })
})
