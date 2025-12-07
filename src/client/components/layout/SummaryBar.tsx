import type { TestSummary } from '@components/types'
import type { Component } from 'solid-js'
import { formatDuration } from '@components/utils'
import { Show } from 'solid-js'

export interface SummaryBarProps {
  summary: TestSummary
}

const SummaryBar: Component<SummaryBarProps> = (props) => {
  return (
    <div class="text-sm px-5 border-b border-white/10 bg-#14141b flex gap-6 h-12 items-center">
      <div class="flex gap-2 items-center">
        <div class="i-ph-check-circle-duotone text-lg text-emerald-400" />
        <span class="text-gray-400 font-medium">PASS</span>
        <span class="text-gray-200 font-bold">{props.summary.passed}</span>
      </div>

      <div class="bg-white/10 h-4 w-px" />

      <div class="flex gap-2 items-center">
        <div class="i-ph-x-circle-duotone text-lg text-red-400" />
        <span class="text-gray-400 font-medium">FAIL</span>
        <span class="text-gray-200 font-bold">{props.summary.failed}</span>
      </div>

      <div class="bg-white/10 h-4 w-px" />

      <div class="flex gap-2 items-center">
        <div class="i-ph-skip-forward-bold text-lg text-gray-400" />
        <span class="text-gray-400 font-medium">SKIP</span>
        <span class="text-gray-200 font-bold">{props.summary.skipped}</span>
      </div>

      <Show when={props.summary.running > 0}>
        <div class="bg-white/10 h-4 w-px" />
        <div class="flex gap-2 items-center">
          <div class="i-gg:spinner text-lg text-amber-400 animate-spin" />
          <span class="text-gray-400 font-medium">RUNNING</span>
          <span class="text-gray-200 font-bold">{props.summary.running}</span>
        </div>
      </Show>

      <div class="flex-1" />

      <div class="flex gap-2 items-center">
        <div class="i-ph-clock-duotone text-lg text-gray-400" />
        <span class="text-gray-400 font-mono">{formatDuration(props.summary.duration)}</span>
      </div>
    </div>
  )
}

export default SummaryBar
