import type { TestNode, TestSummary } from '@components/types'
import type { Component } from 'solid-js'
import { For, Show } from 'solid-js'
import TestTreeItem from './TestTreeItem'

export interface TestExplorerProps {
  roots: string[]
  tests: Record<string, TestNode>
  selectedId: string | null
  onSelect: (id: string) => void
  summary: TestSummary
}

const TestExplorer: Component<TestExplorerProps> = (props) => {
  return (
    <aside class="border-r border-white/10 bg-#14141b flex flex-col w-72 overflow-auto">
      <div class="px-4 py-3 flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-300 font-semibold">Test Explorer</p>
          <p class="text-xs text-gray-500">
            {props.summary.total}
            {' '}
            discovered
          </p>
        </div>
        <Show when={props.summary.running > 0}>
          <span class="text-xs text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/10">Running</span>
        </Show>
      </div>
      <div class="p-2 flex-1 overflow-auto">
        <For each={props.roots}>
          {rootId => (
            <TestTreeItem
              id={rootId}
              store={props.tests}
              onSelect={props.onSelect}
              selectedId={props.selectedId}
            />
          )}
        </For>
        <Show when={props.roots.length === 0}>
          <p class="text-sm text-gray-500 px-3 py-4">No tests yet. Run tests to populate.</p>
        </Show>
      </div>
    </aside>
  )
}

export default TestExplorer
