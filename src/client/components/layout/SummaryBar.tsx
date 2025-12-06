import type { TestSummary } from '@components/types'
import type { Component } from 'solid-js'
import { formatDuration } from '@components/utils'
import { SummaryCard } from '@ui'

export interface SummaryBarProps {
  summary: TestSummary
}

const SummaryBar: Component<SummaryBarProps> = (props) => {
  return (
    <div class="px-5 py-4 border-b border-white/10 bg-#14141b">
      <div class="gap-3 grid grid-cols-4">
        <SummaryCard label="Total" value={props.summary.total} />
        <SummaryCard label="Passed" value={props.summary.passed} accent="text-emerald-400" />
        <SummaryCard label="Failed" value={props.summary.failed} accent="text-red-400" />
        <SummaryCard label="Duration" value={formatDuration(props.summary.duration)} />
      </div>
    </div>
  )
}

export default SummaryBar
