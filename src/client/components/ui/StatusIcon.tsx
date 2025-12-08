import type { TestStatus } from '@components/types'
import type { Component } from 'solid-js'
import { createMemo, Match, Switch } from 'solid-js'

export interface StatusIconProps {
  status: TestStatus
  size?: 'sm' | 'md' | 'lg'
  class?: string
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

const StatusIcon: Component<StatusIconProps> = (props) => {
  const size = createMemo(() => sizeClasses[props.size ?? 'md'])
  const customClass = createMemo(() => props.class ?? '')

  return (
    <Switch fallback={<div class={`i-ph:circle-dashed text-gray-500 ${size()}  ${customClass()}`} />}>
      <Match when={props.status === 'passed'}>
        <div class={`i-ph:check-bold text-emerald-400 ${size()}  ${customClass()}`} />
      </Match>
      <Match when={props.status === 'failed'}>
        <div class={`i-ph:x-bold text-red-400 ${size()}  ${customClass()}`} />
      </Match>
      <Match when={props.status === 'running'}>
        <div class={`i-gg:spinner text-amber-400 animate-spin ${size()}  ${customClass()}`} />
      </Match>
      <Match when={props.status === 'skipped' || props.status === 'todo'}>
        <div class={`i-ph:minus-bold text-gray-500 ${size()}  ${customClass()}`} />
      </Match>
      <Match when={props.status === 'timeout'}>
        <div class={`i-ph:clock-bold text-orange-400 ${size()}  ${customClass()}`} />
      </Match>
    </Switch>
  )
}

export default StatusIcon
