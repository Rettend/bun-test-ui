import type { TestStatus } from '@components/types'
import type { Component } from 'solid-js'
import { getStatusBadgeClass } from '@components/utils'

export interface StatusBadgeProps {
  status: TestStatus
}

const StatusBadge: Component<StatusBadgeProps> = (props) => {
  return (
    <span class={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusBadgeClass(props.status)}`}>
      {props.status}
    </span>
  )
}

export default StatusBadge
