import type { Component } from 'solid-js'

export interface SummaryCardProps {
  label: string
  value: number | string
  accent?: string
}

const SummaryCard: Component<SummaryCardProps> = (props) => {
  return (
    <div class="px-4 py-3 border border-white/10 rounded-xl bg-white/[0.02]">
      <p class="text-xs text-gray-500 font-medium">{props.label}</p>
      <p class={`text-xl font-semibold mt-1 ${props.accent ?? 'text-gray-200'}`}>{props.value}</p>
    </div>
  )
}

export default SummaryCard
