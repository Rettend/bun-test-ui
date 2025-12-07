import type { ConnectionStatus, RunPhase } from '@components/types'
import type { Component } from 'solid-js'
import { Button, ConnectionIndicator } from '@ui'
import { Show } from 'solid-js'

export interface HeaderProps {
  connection: ConnectionStatus
  phase: RunPhase
  onRunTests: () => void
}

const Header: Component<HeaderProps> = (props) => {
  return (
    <header class="px-5 border-b border-white/10 bg-#14141b flex h-16 items-center justify-between">
      <div class="flex gap-6 items-center">
        <ConnectionIndicator status={props.connection} />

        <div class="bg-white/10 h-8 w-px" />

        <nav class="flex gap-6 items-center">
          <button class="text-sm text-gray-200 font-medium py-5 transition-colors relative hover:text-white">
            Dashboard
            <div class="bg-pink-500 h-0.5 shadow-[0_0_10px_rgba(236,72,153,0.5)] bottom-0 left-0 right-0 absolute" />
          </button>
          <button class="text-sm text-gray-500 font-medium cursor-not-allowed" title="Not available yet">
            Coverage
          </button>
        </nav>
      </div>

      <div class="flex gap-4 items-center">
        <Button
          onClick={props.onRunTests}
          disabled={props.connection !== 'connected' || props.phase === 'running'}
        >
          <div class="flex gap-2 items-center">
            <Show
              when={props.phase === 'running'}
              fallback={<div class="i-ph:play-bold text-lg" />}
            >
              <div class="i-gg:spinner text-lg animate-spin" />
            </Show>
            <span>{props.phase === 'idle' ? 'Run Tests' : 'Rerun Tests'}</span>
          </div>
        </Button>
      </div>
    </header>
  )
}

export default Header
