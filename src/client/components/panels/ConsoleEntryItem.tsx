import type { ConsoleEntry as ConsoleEntryType } from '@components/types'
import type { Component } from 'solid-js'
import { formatTimestamp, getStatusBadgeClass } from '@components/utils'
import { Show } from 'solid-js'

export interface ConsoleEntryItemProps {
  entry: ConsoleEntryType
}

const ConsoleEntryItem: Component<ConsoleEntryItemProps> = (props) => {
  const levelClass = () => {
    const level = props.entry.level
    if (level === 'error')
      return getStatusBadgeClass('failed')
    if (level === 'warn' || level === 'warning')
      return getStatusBadgeClass('running')
    return getStatusBadgeClass('passed')
  }

  return (
    <div class="text-sm px-5 py-3 flex gap-3">
      <span class={`text-xs px-2 py-0.5 rounded-full shrink-0 ${levelClass()}`}>
        {props.entry.level}
      </span>
      <div class="flex-1 min-w-0 space-y-1">
        <div class="text-gray-300 font-mono whitespace-pre-wrap break-words">
          {props.entry.message}
        </div>
        <div class="text-xs text-gray-500 flex flex-wrap gap-3">
          <span>{formatTimestamp(props.entry.timestamp)}</span>
          <Show when={props.entry.source}>
            <span class="text-gray-600">{props.entry.source}</span>
          </Show>
          <Show when={props.entry.testId}>
            <span>
              Test #
              {props.entry.testId}
            </span>
          </Show>
        </div>
      </div>
    </div>
  )
}

export default ConsoleEntryItem
