import type { ConsoleEntry } from '@components/types'
import type { Component } from 'solid-js'
import { For, Show } from 'solid-js'
import ConsoleEntryItem from './ConsoleEntryItem'

export interface ConsolePanelProps {
  entries: ConsoleEntry[]
}

const ConsolePanel: Component<ConsolePanelProps> = (props) => {
  return (
    <Show when={props.entries.length > 0}>
      <section class="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
        <div class="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <p class="text-sm text-gray-300 font-semibold">Console</p>
          <p class="text-xs text-gray-500">
            {props.entries.length}
            {' '}
            entries
          </p>
        </div>
        <div class="max-h-64 overflow-auto divide-white/5 divide-y">
          <For each={props.entries}>
            {entry => <ConsoleEntryItem entry={entry} />}
          </For>
        </div>
      </section>
    </Show>
  )
}

export default ConsolePanel
