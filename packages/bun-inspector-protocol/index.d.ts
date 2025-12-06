export class NodeSocketInspector {
  constructor(socket: unknown)
  start(): Promise<boolean>
  send(method: string, params?: unknown): Promise<unknown>
  on(event: string, listener: (...args: any[]) => unknown): this
  close(...args: any[]): void
  readonly closed: boolean
}

export class WebSocketInspector {
  constructor(url?: string | URL)
  start(url?: string | URL): Promise<boolean>
  send(method: string, params?: unknown): Promise<unknown>
  on(event: string, listener: (...args: any[]) => unknown): this
  close(code?: number, reason?: string): void
  readonly closed: boolean
}

export function remoteObjectToString(obj: unknown, topLevel?: boolean): string

export type JSC = Record<string, unknown>

