import type { TestNode } from '@components/types'
import type { Component } from 'solid-js'
import { formatDuration } from '@components/utils'
import { StatusDot } from '@ui'
import { createSignal, For, Show } from 'solid-js'

export interface TestTreeItemProps {
  id: string
  store: Record<string, TestNode>
  onSelect: (id: string) => void
  selectedId?: string | null
}

const TestTreeItem: Component<TestTreeItemProps> = (props) => {
  const node = () => props.store[props.id]
  const [expanded, setExpanded] = createSignal(true)
  const isSelected = () => props.selectedId === node()?.id

  return (
    <Show when={node()} keyed>
      {current => (
        <div class="ml-1">
          <div
            class="px-3 py-1.5 rounded-xl flex gap-2 cursor-pointer transition-colors items-center"
            classList={{
              'bg-#f472b6/10 text-#f472b6': isSelected(),
              'text-gray-400 hover:bg-white/5 hover:text-gray-300': !isSelected(),
            }}
          >
            <button
              class="text-xs text-gray-500 text-left w-4"
              disabled={current.children.length === 0}
              onClick={() => setExpanded(!expanded())}
            >
              {current.children.length === 0 ? '' : expanded() ? '▾' : '▸'}
            </button>
            <StatusDot status={current.status} size="sm" />
            <button
              class="text-sm font-medium text-left flex-1 truncate"
              onClick={() => props.onSelect(current.id)}
            >
              {current.name || 'Test'}
            </button>
            <Show when={current.duration}>
              <span class="text-xs text-gray-500">{formatDuration(current.duration)}</span>
            </Show>
          </div>
          <Show when={expanded() && current.children.length > 0}>
            <div class="ml-3 pl-2 border-l border-white/10">
              <For each={current.children}>
                {childId => (
                  <TestTreeItem
                    id={childId}
                    store={props.store}
                    onSelect={props.onSelect}
                    selectedId={props.selectedId}
                  />
                )}
              </For>
            </div>
          </Show>
          <Show when={current.error}>
            <div class="text-xs text-red-300 font-mono my-1 ml-8 p-2 border border-red-500/20 rounded-lg bg-red-500/10 whitespace-pre-wrap">
              {current.error}
            </div>
          </Show>
        </div>
      )}
    </Show>
  )
}

export default TestTreeItem
