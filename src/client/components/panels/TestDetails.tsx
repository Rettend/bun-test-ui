import type { TestNode } from '@components/types'
import type { Component } from 'solid-js'
import { formatDuration } from '@components/utils'
import { StatusBadge } from '@ui'
import { Show } from 'solid-js'

export interface TestDetailsProps {
  test?: TestNode
}

const TestDetails: Component<TestDetailsProps> = (props) => {
  return (
    <section class="p-5 border border-white/10 rounded-2xl bg-white/[0.02]">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex gap-3 items-center">
          <p class="text-sm text-gray-300 font-semibold">Details</p>
          <Show when={props.test}>
            {test => <StatusBadge status={test().status} />}
          </Show>
        </div>
        <Show when={props.test?.duration}>
          <span class="text-xs text-gray-500">
            Duration:
            {' '}
            {formatDuration(props.test?.duration)}
          </span>
        </Show>
      </div>
      <Show when={props.test} fallback={<p class="text-sm text-gray-500">Select a test to see details.</p>}>
        {test => (
          <div class="space-y-3">
            <p class="text-lg text-gray-200 font-semibold">{test().name}</p>
            <p class="text-xs text-gray-500">
              {test().url ? `${test().url}:${(test().line ?? 0) + 1}` : 'Location unknown'}
            </p>
            <p class="text-xs text-gray-500 capitalize">{test().type}</p>
            <Show when={test().error}>
              <div class="text-sm text-red-300 font-mono mt-4 p-4 border border-red-500/20 rounded-xl bg-red-500/10 whitespace-pre-wrap">
                {test().error}
              </div>
            </Show>
          </div>
        )}
      </Show>
    </section>
  )
}

export default TestDetails
