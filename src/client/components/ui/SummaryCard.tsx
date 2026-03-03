import type { Component } from 'solid-js'

export interface SummaryCardProps {
  icon: string
  iconColor: string
  label: string
  value: number | string
  valueColor: string
}

const SummaryCard: Component<SummaryCardProps> = (props) => {
  return (
    <div class="px-4 py-4 border border-white/10 rounded-xl bg-white/[0.02] flex flex-col min-w-120px justify-center">
      <div class="flex gap-3 items-center">
        <div class={`${props.icon} text-2xl ${props.iconColor} shrink-0`} />
        <p class={`text-4xl font-bold ${props.valueColor} truncate`}>{props.value}</p>
      </div>
      <p class="text-sm text-gray-500 mt-2 truncate">{props.label}</p>
    </div>
  )
}

export default SummaryCard
