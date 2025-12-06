import type { TestStatus } from '@components/types'
import type { Component } from 'solid-js'
import { getStatusDotClass } from '@components/utils'

export interface StatusDotProps {
  status: TestStatus
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

const StatusDot: Component<StatusDotProps> = (props) => {
  return (
    <div
      class={`rounded-full shrink-0 ${sizeClasses[props.size ?? 'md']}  ${getStatusDotClass(props.status)}`}
    />
  )
}

export default StatusDot
