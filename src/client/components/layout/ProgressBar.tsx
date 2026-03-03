import type { Component } from 'solid-js'
import type { TestSummary } from '~/components/types'
import { createMemo, Show } from 'solid-js'

export interface ProgressBarProps {
  summary: TestSummary
}

const ProgressBar: Component<ProgressBarProps> = (props) => {
  const total = createMemo(() => props.summary.passed + props.summary.failed + props.summary.skipped)

  const passPercent = createMemo(() => total() > 0 ? (props.summary.passed / total()) * 100 : 0)
  const failPercent = createMemo(() => total() > 0 ? (props.summary.failed / total()) * 100 : 0)
  const skipPercent = createMemo(() => total() > 0 ? (props.summary.skipped / total()) * 100 : 0)

  return (
    <div class="bg-white/5 flex h-0.75 w-full">
      <Show
        when={total() > 0}
        fallback={
          <div class="h-full w-full animate-pulse from-dark-500/50 to-dark-500/50 via-dark-400/80 bg-gradient-to-r" />
        }
      >
        <div
          class="bg-emerald-500 h-full transition-all duration-300"
          style={{ width: `${passPercent()}%` }}
        />
        <div
          class="bg-red-500 h-full transition-all duration-300"
          style={{ width: `${failPercent()}%` }}
        />
        <div
          class="bg-gray-500 h-full transition-all duration-300"
          style={{ width: `${skipPercent()}%` }}
        />
      </Show>
    </div>
  )
}

export default ProgressBar
