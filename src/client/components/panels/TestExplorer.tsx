import type { Component } from 'solid-js'
import type { TestNode, TestSummary } from '~/components/types'
import { For, Show } from 'solid-js'
import TestTreeItem from './TestTreeItem'

export interface TestExplorerProps {
  roots: string[]
  tests: Record<string, TestNode>
  selectedId: string | null
  onSelect: (id: string) => void
  onRunTest?: (id: string) => void
  summary: TestSummary
}

const TestExplorer: Component<TestExplorerProps> = (props) => {
  return (
    <aside class="border-r border-white/10 bg-#14141b flex flex-col h-full w-full overflow-auto">
      <div class="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
        <p class="text-sm text-gray-300 font-semibold">Test Explorer</p>
        <span class="text-xs text-gray-500 font-medium">
          {props.summary.total}
          {' '}
          tests
        </span>
      </div>
      <div class="scrollbar-thin py-1 flex-1 overflow-auto">
        <For each={props.roots}>
          {rootId => (
            <TestTreeItem
              id={rootId}
              store={props.tests}
              onSelect={props.onSelect}
              onRunTest={props.onRunTest}
              selectedId={props.selectedId}
              depth={0}
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
