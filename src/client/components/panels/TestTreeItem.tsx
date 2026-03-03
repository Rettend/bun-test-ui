import type { Component, JSX } from 'solid-js'
import type { TestNode, TestStatus } from '~/components/types'
import { createMemo, createSignal, For, Show } from 'solid-js'
import { StatusIcon } from '~/components'
import { formatDuration, getAggregateStatus } from '~/components/utils'

export interface TestTreeItemProps {
  id: string
  store: Record<string, TestNode>
  onSelect: (id: string) => void
  onRunTest?: (id: string) => void
  selectedId?: string | null
  depth?: number
}

function getStatusBgClass(status: TestStatus): string {
  switch (status) {
    case 'passed':
      return 'bg-emerald-500/10'
    case 'failed':
      return 'bg-red-500/10'
    case 'running':
      return 'bg-amber-500/10'
    case 'timeout':
      return 'bg-orange-500/10'
    default:
      return 'bg-white/5'
  }
}

const TestTreeItem: Component<TestTreeItemProps> = (props) => {
  const node = createMemo(() => props.store[props.id])
  const [expanded, setExpanded] = createSignal(true)
  const [hovered, setHovered] = createSignal(false)
  const isSelected = createMemo(() => props.selectedId === node()?.id)
  const depth = createMemo(() => props.depth ?? 0)

  const hasChildren = createMemo(() => (node()?.children.length ?? 0) > 0)

  const status = createMemo(() => {
    const n = node()
    if (!n)
      return 'idle'
    return getAggregateStatus(n, props.store)
  })

  const handleRowClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = (e) => {
    if ((e.target as HTMLElement).closest('[data-play-btn]'))
      return
    props.onSelect(node()!.id)
  }

  const handleChevronClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (e) => {
    e.stopPropagation()
    setExpanded(!expanded())
  }

  const handlePlayClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (e) => {
    e.stopPropagation()
    props.onRunTest?.(node()!.id)
  }

  return (
    <Show when={node()} keyed>
      {current => (
        <div>
          <div
            class="group pr-2 flex h-7 select-none transition-colors items-center"
            classList={{
              [getStatusBgClass(status())]: isSelected(),
              'hover:bg-white/5': !isSelected(),
            }}
            style={{ 'padding-left': `${depth() * 12 + 4}px` }}
            onClick={handleRowClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <button
              class="text-gray-500 flex shrink-0 h-4 w-4 transition-colors items-center justify-center hover:text-gray-300"
              classList={{ 'opacity-0 pointer-events-none': !hasChildren() }}
              onClick={handleChevronClick}
            >
              <div
                class="i-ph:caret-right-bold text-xs transition-transform"
                classList={{ 'rotate-90': expanded() }}
              />
            </button>

            <div class="flex shrink-0 h-5 w-5 items-center justify-center">
              <StatusIcon status={status()} size="sm" />
            </div>

            <span
              class="text-xs font-medium ml-1 flex-1 truncate"
              classList={{
                'text-gray-200': isSelected() || status() === 'passed' || status() === 'failed',
                'text-gray-400': !isSelected() && status() !== 'passed' && status() !== 'failed',
              }}
            >
              {current.name || 'Test'}
            </span>

            <Show when={current.type === 'test' && current.duration != null && current.duration > 0 && status() !== 'running'}>
              <span class="text-xs text-gray-500 font-mono ml-2 tabular-nums">
                {formatDuration(current.duration)}
              </span>
            </Show>
            <Show when={current.type === 'describe' && current.children.length > 0}>
              <span class="text-xs text-gray-500 ml-2 tabular-nums">
                {current.children.length}
              </span>
            </Show>

            <Show when={hovered()}>
              <button
                data-play-btn
                class="text-gray-500 ml-1 flex shrink-0 h-5 w-5 transition-colors items-center justify-center hover:text-emerald-400"
                onClick={handlePlayClick}
                title={`Run ${current.type === 'describe' ? 'suite' : 'test'}`}
              >
                <div class="i-ph:play-fill text-xs" />
              </button>
            </Show>
          </div>

          <Show when={expanded() && hasChildren()}>
            <div class="relative">
              <div
                class="bg-white/10 w-px bottom-0 top-0 absolute"
                style={{ left: `${depth() * 12 + 11}px` }}
              />
              <For each={current.children}>
                {childId => (
                  <TestTreeItem
                    id={childId}
                    store={props.store}
                    onSelect={props.onSelect}
                    onRunTest={props.onRunTest}
                    selectedId={props.selectedId}
                    depth={depth() + 1}
                  />
                )}
              </For>
            </div>
          </Show>
        </div>
      )}
    </Show>
  )
}

export default TestTreeItem
