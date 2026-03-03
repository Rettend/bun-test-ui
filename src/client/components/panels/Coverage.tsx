import type { Component } from 'solid-js'
import type { CoverageReport, RunPhase } from '~/components/types'
import { For, Show } from 'solid-js'

export interface CoverageProps {
  report: CoverageReport | null
  phase: RunPhase
  enabled: boolean
  dir: string
}

function formatRatio(covered: number, total: number): string {
  return `${covered}/${total}`
}

export function formatCoveragePct(covered: number, total: number, pct: number): string {
  if (total <= 0)
    return '—'
  if (covered <= 0)
    return '0.0%'
  return `${pct.toFixed(1)}%`
}

const Coverage: Component<CoverageProps> = (props) => {
  const totals = () => props.report?.totals
  const files = () => props.report?.files ?? []

  return (
    <div class="p-6 flex flex-1 overflow-auto">
      <Show
        when={props.enabled}
        fallback={(
          <div class="m-auto text-center max-w-2xl space-y-4">
            <div class="i-ph:chart-pie-slice-duotone text-6xl text-gray-600 mx-auto" />
            <p class="text-gray-300 font-medium">No coverage data from Bun</p>
            <p class="text-sm text-gray-500">Enable it in bunfig.toml with [test].coverage = true</p>
          </div>
        )}
      >
        <div class="mx-auto max-w-5xl w-full space-y-6">
          <Show
            when={props.phase !== 'running'}
            fallback={(
              <div class="text-sm text-amber-300 px-4 py-3 border border-amber-500/20 rounded-lg bg-amber-500/10 flex gap-2 items-center">
                <div class="i-gg:spinner animate-spin" />
                Collecting coverage...
              </div>
            )}
          >
            <Show
              when={totals()}
              fallback={(
                <div class="text-sm text-gray-500 px-4 py-3 border border-white/10 rounded-lg">
                  No coverage report available yet. The report is expected at
                  {' '}
                  <code class="text-gray-300">
                    {props.dir}
                    /lcov.info
                  </code>
                  .
                </div>
              )}
            >
              {summary => (
                <>
                  <div class="gap-3 grid grid-cols-1 md:grid-cols-3">
                    <div class="p-4 border border-white/10 rounded-lg bg-white/[0.02]">
                      <p class="text-xs text-gray-500 tracking-wide uppercase">Lines</p>
                      <p class="text-2xl text-gray-200 font-semibold mt-1">{formatCoveragePct(summary().lines.covered, summary().lines.total, summary().lines.pct)}</p>
                      <p class="text-xs text-gray-500 mt-1">{formatRatio(summary().lines.covered, summary().lines.total)}</p>
                    </div>
                    <div class="p-4 border border-white/10 rounded-lg bg-white/[0.02]">
                      <p class="text-xs text-gray-500 tracking-wide uppercase">Functions</p>
                      <p class="text-2xl text-gray-200 font-semibold mt-1">{formatCoveragePct(summary().functions.covered, summary().functions.total, summary().functions.pct)}</p>
                      <p class="text-xs text-gray-500 mt-1">{formatRatio(summary().functions.covered, summary().functions.total)}</p>
                    </div>
                    <div class="p-4 border border-white/10 rounded-lg bg-white/[0.02]">
                      <p class="text-xs text-gray-500 tracking-wide uppercase">Branches</p>
                      <p class="text-2xl text-gray-200 font-semibold mt-1">{formatCoveragePct(summary().branches.covered, summary().branches.total, summary().branches.pct)}</p>
                      <p class="text-xs text-gray-500 mt-1">{formatRatio(summary().branches.covered, summary().branches.total)}</p>
                    </div>
                  </div>

                  <div class="border border-white/10 rounded-lg overflow-hidden">
                    <div class="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                      <p class="text-sm text-gray-300 font-semibold">Files</p>
                      <p class="text-xs text-gray-500">
                        {files().length}
                        {' '}
                        file
                        {files().length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div class="max-h-[36rem] overflow-auto divide-white/5 divide-y">
                      <For each={files()}>
                        {file => (
                          <div class="text-xs px-4 py-2 gap-4 grid grid-cols-[1fr_auto_auto_auto] items-center">
                            <span class="text-gray-300 font-mono truncate">{file.path}</span>
                            <span class="text-gray-400 text-right min-w-18">
                              L
                              {formatCoveragePct(file.lines.covered, file.lines.total, file.lines.pct)}
                            </span>
                            <span class="text-gray-400 text-right min-w-18">
                              F
                              {formatCoveragePct(file.functions.covered, file.functions.total, file.functions.pct)}
                            </span>
                            <span class="text-gray-400 text-right min-w-18">
                              B
                              {formatCoveragePct(file.branches.covered, file.branches.total, file.branches.pct)}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </>
              )}
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  )
}

export default Coverage
