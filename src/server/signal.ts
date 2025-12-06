import type { Socket } from 'node:net'
import { EventEmitter } from 'node:events'
import { createServer } from 'node:net'
import process from 'node:process'

const isDebug = process.env.NODE_ENV === 'development'

export interface SignalEventMap {
  'Signal.listening': []
  'Signal.error': [Error]
  'Signal.closed': []
  'Signal.received': [string]
  'Signal.Socket.closed': [socket: Socket]
  'Signal.Socket.connect': [socket: Socket]
}

export class TCPSocketSignal extends EventEmitter {
  #port: number
  #server: ReturnType<typeof createServer>
  #ready: Promise<void>

  constructor(port: number) {
    super()
    this.#port = port

    this.#server = createServer((socket: Socket) => {
      this.emit('Signal.Socket.connect', socket)

      socket.on('data', (data) => {
        this.emit('Signal.received', data.toString())
      })

      socket.on('error', (error) => {
        this.emit('Signal.error', error)
      })

      socket.on('close', () => {
        this.emit('Signal.Socket.closed', socket)
      })
    })

    this.#server.on('close', () => {
      this.emit('Signal.closed')
    })

    this.#ready = new Promise((resolve, reject) => {
      this.#server.listen(this.#port, '127.0.0.1', () => {
        this.emit('Signal.listening')
        resolve()
      })
      this.#server.on('error', reject)
    })
  }

  override emit<E extends keyof SignalEventMap>(event: E, ...args: SignalEventMap[E]): boolean {
    if (isDebug)
      console.warn('[Signal]', event, ...args)

    return super.emit(event, ...args)
  }

  get port(): number {
    return this.#port
  }

  get url(): string {
    return `tcp://127.0.0.1:${this.#port}`
  }

  get ready(): Promise<void> {
    return this.#ready
  }

  close(): void {
    this.#server.close()
  }
}
