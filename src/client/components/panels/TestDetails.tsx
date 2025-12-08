import type { ConsoleEntry, TestNode } from '@components/types'
import type { Component } from 'solid-js'
import { formatDuration, getAggregateStatus } from '@components/utils'
import { StatusIcon } from '@ui'
import { createMemo, For, Show } from 'solid-js'
import { ansiToHtml } from '../../utils/ansi'

export interface TestDetailsProps {
  test: TestNode
  tests: Record<string, TestNode>
  consoleEntries?: ConsoleEntry[]
  onNavigate: (id: string | null) => void
}

const TestDetails: Component<TestDetailsProps> = (props) => {
  const breadcrumb = createMemo(() => {
    const path: Array<{ id: string, name: string }> = []
    let current: TestNode | undefined = props.test

    while (current) {
      path.unshift({ id: current.id, name: current.name })
      current = current.parentId ? props.tests[current.parentId] : undefined
    }

    return path
  })

  const filteredConsole = createMemo(() => {
    return (props.consoleEntries ?? []).filter(e => e.testId === props.test.id)
  })

  const fileLocation = createMemo(() => {
    if (!props.test.url)
      return null
    const line = props.test.line !== undefined ? `:${props.test.line + 1}` : ''
    return `${props.test.url}${line}`
  })

  const statusColors: Record<string, { bg: string, text: string, border: string }> = {
    passed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    timeout: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    skipped: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
    todo: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    running: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    idle: { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20' },
  }

  const status = createMemo(() => getAggregateStatus(props.test, props.tests))

  const colors = createMemo(() =>
    statusColors[status()] ?? statusColors.idle!,
  )

  return (
    <div class="space-y-4">
      <div class="flex gap-3 items-start">
        <StatusIcon status={status()} class="text-xl mt-1.3 shrink-0" />
        <div class="flex-1 min-w-0">
          <h1 class="text-lg text-gray-200 font-semibold break-words">{props.test.name}</h1>
          <p class="text-xs text-gray-500 mt-1 h-4">
            {props.test.duration !== undefined ? formatDuration(props.test.duration) : '\u00A0'}
          </p>
        </div>
      </div>

      <Show when={breadcrumb().length > 1}>
        <nav class="text-xs flex flex-wrap gap-1 items-center">
          <For each={breadcrumb()}>
            {(item, index) => (
              <>
                <Show when={index() > 0}>
                  <span class="i-ph:caret-right text-gray-600" />
                </Show>
                <button
                  class={`transition-colors ${
                    index() === breadcrumb().length - 1
                      ? 'text-gray-300'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  onClick={() => props.onNavigate(item.id)}
                  disabled={index() === breadcrumb().length - 1}
                >
                  {item.name}
                </button>
              </>
            )}
          </For>
        </nav>
      </Show>

      <div class={`border ${colors().border} rounded-lg ${colors().bg} p-3`}>
        <div class="text-sm gap-x-6 gap-y-2 grid grid-cols-2">
          <div class="flex gap-2 items-center">
            <span class="text-gray-500">Type:</span>
            <span class="text-gray-300 capitalize">{props.test.type}</span>
          </div>
          <div class="flex gap-2 items-center">
            <span class="text-gray-500">Status:</span>
            <span class={`${colors().text} capitalize`}>{status()}</span>
          </div>
          <Show when={fileLocation()}>
            <div class="flex gap-2 col-span-2 items-center">
              <span class="text-gray-500">File:</span>
              <span class="text-xs text-gray-300 font-mono break-all">{fileLocation()}</span>
            </div>
          </Show>
          <Show when={props.test.duration !== undefined}>
            <div class="flex gap-2 items-center">
              <span class="text-gray-500">Duration:</span>
              <span class="text-gray-300 font-mono">{formatDuration(props.test.duration)}</span>
            </div>
          </Show>
        </div>
      </div>

      <Show when={props.test.error}>
        <div class="border border-red-500/20 rounded-lg bg-red-500/10 overflow-hidden">
          <div class="px-3 py-2 border-b border-red-500/20 bg-red-500/5">
            <p class="text-xs text-red-400 font-medium flex gap-2 items-center">
              <span class="i-ph:warning-duotone" />
              Error
            </p>
          </div>
          <div
            class="ansi-output text-sm text-red-200 font-mono p-3 whitespace-pre-wrap break-words"
            // eslint-disable-next-line solid/no-innerhtml
            innerHTML={ansiToHtml(props.test.error!)}
          />
        </div>
      </Show>

      <Show when={filteredConsole().length > 0}>
        <div class="border border-white/10 rounded-lg overflow-hidden">
          <div class="px-3 py-2 border-b border-white/10 bg-white/[0.02]">
            <p class="text-xs text-gray-400 font-medium flex items-center justify-between">
              <span class="flex gap-2 items-center">
                <span class="i-ph:terminal-duotone" />
                Console Output
              </span>
              <span class="text-gray-600">
                {filteredConsole().length}
                {' '}
                entries
              </span>
            </p>
          </div>
          <div class="max-h-48 overflow-auto divide-white/5 divide-y">
            <For each={filteredConsole()}>
              {entry => (
                <div class="text-sm px-3 py-2">
                  <span class={`text-xs mr-2 px-1.5 py-0.5 rounded ${
                    entry.level === 'error'
                      ? 'bg-red-500/20 text-red-400'
                      : entry.level === 'warn'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gray-500/20 text-gray-400'
                  }`}
                  >
                    {entry.level}
                  </span>
                  <span
                    class="ansi-output text-gray-300 font-mono"
                    // eslint-disable-next-line solid/no-innerhtml
                    innerHTML={ansiToHtml(entry.message)}
                  />
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={props.test.type === 'describe' && props.test.children.length > 0}>
        <div class="border border-white/10 rounded-lg overflow-hidden">
          <div class="px-3 py-2 border-b border-white/10 bg-white/[0.02]">
            <p class="text-xs text-gray-400 font-medium">
              Tests (
              {props.test.children.length}
              )
            </p>
          </div>
          <div class="divide-white/5 divide-y">
            <For each={props.test.children}>
              {(childId) => {
                const child = () => props.tests[childId]
                return (
                  <Show when={child()}>
                    <button
                      class="px-3 py-2 text-left flex gap-2 w-full transition-colors items-center hover:bg-white/5"
                      onClick={() => props.onNavigate(childId)}
                    >
                      <StatusIcon status={child()!.status} class="text-sm" />
                      <span class="text-sm text-gray-300 flex-1 truncate">{child()!.name}</span>
                      <span class="text-xs text-gray-500 capitalize">{child()!.type}</span>
                    </button>
                  </Show>
                )
              }}
            </For>
          </div>
        </div>
      </Show>

      <Show when={props.test.type === 'describe'}>
        {(() => {
          const childErrors = () => props.test.children
            .map(id => props.tests[id])
            .filter((child): child is TestNode => Boolean(child?.error))
          return (
            <Show when={childErrors().length > 0}>
              <div class="border border-red-500/20 rounded-lg bg-red-500/10 overflow-hidden">
                <div class="px-3 py-2 border-b border-red-500/20 bg-red-500/5">
                  <p class="text-xs text-red-400 font-medium flex gap-2 items-center">
                    <span class="i-ph:warning-duotone" />
                    Errors (
                    {childErrors().length}
                    )
                  </p>
                </div>
                <div class="divide-red-500/10 divide-y">
                  <For each={childErrors()}>
                    {child => (
                      <div class="p-3">
                        <button
                          class="text-xs text-red-300 font-medium mb-2 flex gap-2 items-center hover:text-red-200"
                          onClick={() => props.onNavigate(child.id)}
                        >
                          <StatusIcon status={child.status} size="sm" />
                          {child.name}
                        </button>
                        <div
                          class="ansi-output text-xs text-red-200/80 font-mono whitespace-pre-wrap break-words"
                          // eslint-disable-next-line solid/no-innerhtml
                          innerHTML={ansiToHtml(child.error!)}
                        />
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          )
        })()}
      </Show>
    </div>
  )
}

export default TestDetails
