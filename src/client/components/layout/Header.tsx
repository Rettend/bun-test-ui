import type { ConnectionStatus, RunPhase } from '@components/types'
import type { Component } from 'solid-js'
import { Button, ConnectionIndicator } from '@ui'

export interface HeaderProps {
  connection: ConnectionStatus
  phase: RunPhase
  onRunTests: () => void
}

const phaseLabels: Record<RunPhase, string> = {
  running: 'Running tests…',
  done: 'Last run finished',
  idle: 'Idle',
}

const Header: Component<HeaderProps> = (props) => {
  return (
    <header class="px-5 border-b border-white/10 bg-#14141b flex h-14 items-center justify-between">
      <ConnectionIndicator status={props.connection} />
      <div class="flex gap-4 items-center">
        <span class="text-sm text-gray-500">{phaseLabels[props.phase]}</span>
        <Button
          onClick={props.onRunTests}
          disabled={props.connection !== 'connected' || props.phase === 'running'}
        >
          {props.phase === 'idle' ? 'Run Tests' : 'Rerun Tests'}
        </Button>
      </div>
    </header>
  )
}

export default Header
