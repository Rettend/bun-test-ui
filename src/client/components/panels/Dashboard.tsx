import type { Component } from 'solid-js'
import type { RunPhase, TestSummary } from '~/components/types'
import { createMemo, Show } from 'solid-js'
import { SummaryCard } from '~/components'
import { formatDuration } from '~/components/utils'

export interface DashboardProps {
  summary: TestSummary
  phase: RunPhase
}

const Dashboard: Component<DashboardProps> = (props) => {
  const hasTests = createMemo(() => props.summary.total > 0 || props.phase === 'running')
  const passRate = createMemo(() => {
    const total = props.summary.passed + props.summary.failed
    if (total === 0)
      return 0
    return Math.round((props.summary.passed / total) * 100)
  })

  return (
    <div class="p-6 flex flex-1 items-center justify-center">
      <Show
        when={hasTests()}
        fallback={(
          <div class="text-center space-y-4">
            <div class="i-ph:test-tube-duotone text-6xl text-gray-600 mx-auto" />
            <div class="space-y-2">
              <p class="text-gray-400 font-medium">No test results yet</p>
              <p class="text-sm text-gray-600">
                Press Run Tests to start
              </p>
            </div>
          </div>
        )}
      >
        <div class="max-w-xl w-full space-y-6">
          <div class="flex gap-3">
            <div class="flex-auto">
              <SummaryCard
                icon="i-ph:check-circle-duotone"
                iconColor="text-emerald-400"
                label="Passed"
                value={props.summary.passed}
                valueColor="text-emerald-400"
              />
            </div>
            <div class="flex-auto">
              <SummaryCard
                icon="i-ph:x-circle-duotone"
                iconColor="text-red-400"
                label="Failed"
                value={props.summary.failed}
                valueColor="text-red-400"
              />
            </div>
            <div class="flex-auto">
              <SummaryCard
                icon="i-ph:skip-forward-bold"
                iconColor="text-gray-400"
                label="Skipped"
                value={props.summary.skipped}
                valueColor="text-gray-400"
              />
            </div>
            <div class="flex-auto">
              <SummaryCard
                icon="i-ph:stack-bold"
                iconColor="text-gray-300"
                label="Total"
                value={props.summary.total}
                valueColor="text-gray-200"
              />
            </div>
          </div>

          <div class="py-4 flex gap-8 items-center justify-center">
            <div class="text-center">
              <p class="text-3xl text-gray-200 font-bold">
                {passRate()}
                %
              </p>
              <p class="text-sm text-gray-500 mt-1">Pass Rate</p>
            </div>
            <div class="bg-white/10 h-8 w-px" />
            <div class="text-center">
              <p class="text-3xl text-gray-200 font-bold font-mono">{formatDuration(props.summary.duration)}</p>
              <p class="text-sm text-gray-500 mt-1">Duration</p>
            </div>
          </div>

          <div class="flex h-8 items-center justify-center">
            <div
              class="text-amber-400 flex gap-2 transition-opacity duration-200 items-center"
              classList={{ 'opacity-0': props.phase !== 'running', 'opacity-100': props.phase === 'running' }}
            >
              <div class="i-gg:spinner animate-spin" />
              <span class="text-sm">
                Running
                {' '}
                {props.summary.running}
                {' '}
                test
                {props.summary.running !== 1 ? 's' : ''}
                ...
              </span>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default Dashboard
