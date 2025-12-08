import type { Component } from 'solid-js'
import type { ConnectionStatus } from '~/components/types'

export interface ConnectionIndicatorProps {
  status: ConnectionStatus
  showLabel?: boolean
}

const statusConfig = {
  connected: {
    dotClass: 'bg-emerald-400',
    label: 'Connected to inspector',
  },
  connecting: {
    dotClass: 'bg-amber-400 animate-pulse',
    label: 'Connecting…',
  },
  disconnected: {
    dotClass: 'bg-red-400',
    label: 'Disconnected',
  },
}

const ConnectionIndicator: Component<ConnectionIndicatorProps> = (props) => {
  const config = () => statusConfig[props.status]

  return (
    <div class="flex gap-3 items-center">
      <div class={`rounded-full h-2.5 w-2.5 ${config().dotClass}`} />
      {props.showLabel !== false && (
        <div>
          <p class="text-gray-200 leading-tight font-semibold">Bun Test UI</p>
          <p class="text-xs text-gray-500">{config().label}</p>
        </div>
      )}
    </div>
  )
}

export default ConnectionIndicator
