import type { ConnectionStatus, RunPhase, TestSummary } from '@components/types'
import type { Component } from 'solid-js'
import { formatDuration } from '@components/utils'
import { Button, ConnectionIndicator, HourglassSpinner } from '@ui'
import { Show } from 'solid-js'

export type ActiveTab = 'dashboard' | 'coverage'

export interface HeaderProps {
  connection: ConnectionStatus
  phase: RunPhase
  activeTab: ActiveTab | null
  summary: TestSummary
  onRunTests: () => void
  onTabChange: (tab: ActiveTab) => void
}

const Header: Component<HeaderProps> = (props) => {
  const isDashboard = () => props.activeTab === 'dashboard'
  const isCoverage = () => props.activeTab === 'coverage'

  return (
    <header class="px-4 border-b border-white/10 bg-#14141b flex h-12 items-center justify-between">
      <div class="flex gap-4 min-w-0 items-center">
        <ConnectionIndicator status={props.connection} />

        <div class="bg-white/10 shrink-0 h-6 w-px" />

        <nav class="flex shrink-0 items-center">
          <button
            class="px-2 flex h-12 transition-colors items-center relative"
            classList={{
              'text-pink-400': isDashboard(),
              'text-gray-500 hover:text-gray-300': !isDashboard(),
            }}
            onClick={() => props.onTabChange('dashboard')}
            title="Dashboard"
          >
            <div class="i-ph:squares-four-duotone text-xl" />
            <Show when={isDashboard()}>
              <div class="bg-pink-500 h-0.5 shadow-[0_0_10px_rgba(236,72,153,0.5)] bottom-0 left-0 right-0 absolute" />
            </Show>
          </button>
          <button
            class="px-2 flex h-12 transition-colors items-center relative"
            classList={{
              'text-pink-400': isCoverage(),
              'text-gray-500 hover:text-gray-300': !isCoverage(),
            }}
            onClick={() => props.onTabChange('coverage')}
            title="Coverage"
          >
            <div class="i-ph:chart-pie-slice-duotone text-xl" />
            <Show when={isCoverage()}>
              <div class="bg-pink-500 h-0.5 shadow-[0_0_10px_rgba(236,72,153,0.5)] bottom-0 left-0 right-0 absolute" />
            </Show>
          </button>
        </nav>

        <div class="bg-white/10 shrink-0 h-6 w-px" />

        <div class="text-sm flex gap-4 min-w-0 items-center overflow-hidden">
          <div class="flex shrink-0 gap-1.5 items-center">
            <div class="i-ph:check-circle-duotone text-lg text-emerald-400" />
            <span class="text-gray-400 font-medium hidden sm:inline">PASS</span>
            <span class="text-gray-200 font-bold">{props.summary.passed}</span>
          </div>

          <div class="bg-white/10 shrink-0 h-4 w-px" />

          <div class="flex shrink-0 gap-1.5 items-center">
            <div class="i-ph:x-circle-duotone text-lg text-red-400" />
            <span class="text-gray-400 font-medium hidden sm:inline">FAIL</span>
            <span class="text-gray-200 font-bold">{props.summary.failed}</span>
          </div>

          <div class="bg-white/10 shrink-0 h-4 w-px" />

          <div class="flex shrink-0 gap-1.5 items-center">
            <div class="i-ph:skip-forward-bold text-lg text-gray-400" />
            <span class="text-gray-400 font-medium hidden sm:inline">SKIP</span>
            <span class="text-gray-200 font-bold">{props.summary.skipped}</span>
          </div>

          <Show when={props.summary.running > 0}>
            <div class="bg-white/10 shrink-0 h-4 w-px" />
            <div class="flex shrink-0 gap-1.5 items-center">
              <HourglassSpinner class="text-lg text-amber-400" />
              <span class="text-gray-400 font-medium hidden sm:inline">RUNNING</span>
              <span class="text-gray-200 font-bold">{props.summary.running}</span>
            </div>
          </Show>
        </div>
      </div>

      <div class="flex shrink-0 gap-4 items-center">
        <div class="text-sm gap-1.5 hidden items-center md:flex">
          <div class="i-ph:clock-duotone text-lg text-gray-400" />
          <span class="text-gray-400 font-mono">{formatDuration(props.summary.duration)}</span>
        </div>

        <Button
          onClick={props.onRunTests}
          disabled={props.connection !== 'connected' || props.phase === 'running'}
        >
          <div class="flex gap-2 items-center">
            <Show
              when={props.phase === 'running'}
              fallback={<div class="i-ph:play-bold text-lg" />}
            >
              <div class="i-gg:spinner text-lg animate-spin" />
            </Show>
            <span class="hidden sm:inline">{props.phase === 'idle' ? 'Run Tests' : 'Rerun Tests'}</span>
          </div>
        </Button>
      </div>
    </header>
  )
}

export default Header
