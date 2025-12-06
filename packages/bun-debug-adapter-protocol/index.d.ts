export type { DAP } from "./src/protocol/index.d.ts"

export type DebugAdapterEventMap = Record<string, unknown>

export class BaseDebugAdapter {
  constructor(...args: any[])
  start(...args: any[]): Promise<void>
  stop(...args: any[]): Promise<void>
}

export class NodeSocketDebugAdapter extends BaseDebugAdapter {}
export class WebSocketDebugAdapter extends BaseDebugAdapter {}
export const DebugAdapter: typeof WebSocketDebugAdapter

export function getAvailablePort(): Promise<number>
export function getRandomId(): string
export function normalizeWindowsPath(winPath: string): string

