import type { Component } from 'solid-js'
import type { CoverageFile, CoverageReport, RunPhase } from '~/components/types'
import { createMemo, createSignal, For, Show } from 'solid-js'

export interface CoverageProps {
  report: CoverageReport | null
  phase: RunPhase
  enabled: boolean
  dir: string
}

function getCoverageColorClass(pct: number): string {
  if (pct >= 80)
    return 'text-emerald-400'
  if (pct >= 50)
    return 'text-amber-400'
  return 'text-red-400'
}

function getCoverageBgClass(pct: number): string {
  if (pct >= 80)
    return 'bg-emerald-500'
  if (pct >= 50)
    return 'bg-amber-500'
  return 'bg-red-500'
}

function getCoverageBorderClass(pct: number): string {
  if (pct >= 80)
    return 'border-emerald-500/20'
  if (pct >= 50)
    return 'border-amber-500/20'
  return 'border-red-500/20'
}

function clampPct(pct: number): number {
  return Math.min(pct, 100)
}

function normalizeMetricPct(covered: number, total: number, pct: number): number {
  if (total <= 0)
    return 100
  if (covered <= 0)
    return 0
  return Number.isFinite(pct) ? pct : 0
}

function computePct(covered: number, total: number): number {
  if (total <= 0)
    return 100
  if (covered <= 0)
    return 0
  return Number(((covered / total) * 100).toFixed(1))
}

export function formatCoveragePct(covered: number, total: number, pct: number): string {
  if (total <= 0)
    return '—'
  if (covered <= 0)
    return '0.0%'
  return `${pct.toFixed(1)}%`
}

interface FolderNode {
  name: string
  files: CoverageFile[]
  folders: FolderNode[]
  lines: { covered: number, total: number }
  functions: { covered: number, total: number }
  branches: { covered: number, total: number }
}

function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + fn(item), 0)
}

function sortByFileName(a: CoverageFile, b: CoverageFile): number {
  const aName = a.path.split('/').pop() ?? a.path
  const bName = b.path.split('/').pop() ?? b.path
  return aName.localeCompare(bName)
}

function countFiles(folder: FolderNode): number {
  return folder.files.length + folder.folders.reduce((sum, child) => sum + countFiles(child), 0)
}

function buildFolderTree(files: CoverageFile[]): { folders: FolderNode[], rootFiles: CoverageFile[] } {
  interface BuildNode {
    name: string
    files: CoverageFile[]
    children: Map<string, BuildNode>
  }

  const root: BuildNode = { name: '', files: [], children: new Map() }

  for (const file of files) {
    const parts = file.path.replace(/\\/g, '/').split('/')
    parts.pop()

    let current = root
    for (const part of parts) {
      if (!current.children.has(part))
        current.children.set(part, { name: part, files: [], children: new Map() })
      current = current.children.get(part)!
    }
    current.files.push(file)
  }

  function getAllFiles(node: BuildNode): CoverageFile[] {
    const result = [...node.files]
    for (const child of node.children.values())
      result.push(...getAllFiles(child))
    return result
  }

  function convert(node: BuildNode): FolderNode {
    const allFiles = getAllFiles(node)
    const folders = Array.from(node.children.values())
      .map(convert)
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      name: node.name,
      files: [...node.files].sort(sortByFileName),
      folders,
      lines: { covered: sumBy(allFiles, f => f.lines.covered), total: sumBy(allFiles, f => f.lines.total) },
      functions: { covered: sumBy(allFiles, f => f.functions.covered), total: sumBy(allFiles, f => f.functions.total) },
      branches: { covered: sumBy(allFiles, f => f.branches.covered), total: sumBy(allFiles, f => f.branches.total) },
    }
  }

  const rootNode = convert(root)
  return { folders: rootNode.folders, rootFiles: rootNode.files }
}

function CoverageBar(props: { pct: number }) {
  return (
    <div class="rounded-full bg-white/5 h-1.5 w-full overflow-hidden">
      <div
        class={`rounded-full h-full transition-all duration-500 ${getCoverageBgClass(props.pct)}`}
        style={{ width: `${clampPct(props.pct)}%` }}
      />
    </div>
  )
}

function CoverageCell(props: { covered: number, total: number, pct: number }) {
  const pct = () => normalizeMetricPct(props.covered, props.total, props.pct)
  const hasData = () => props.total > 0

  return (
    <div class="rounded flex h-6 items-center justify-end relative overflow-hidden">
      <Show when={hasData()}>
        <div
          class={`inset-y-0 left-0 absolute ${getCoverageBgClass(pct())} opacity-15 transition-all duration-500`}
          style={{ width: `${clampPct(pct())}%` }}
        />
      </Show>
      <span
        class={`text-xs font-mono px-2 relative tabular-nums ${hasData() ? getCoverageColorClass(pct()) : 'text-gray-600'}`}
      >
        {formatCoveragePct(props.covered, props.total, props.pct)}
      </span>
    </div>
  )
}

function SummaryMetricCard(props: {
  label: string
  icon: string
  covered: number
  total: number
  pct: number
}) {
  const displayPct = () => normalizeMetricPct(props.covered, props.total, props.pct)
  const hasData = () => props.total > 0

  return (
    <div class={`p-4 border rounded-lg ${hasData() ? getCoverageBorderClass(displayPct()) : 'border-white/10'} bg-white/[0.02] space-y-3`}>
      <div class="flex items-center justify-between">
        <div class="flex gap-2 items-center">
          <div class={`${props.icon} text-base ${hasData() ? getCoverageColorClass(displayPct()) : 'text-gray-600'}`} />
          <p class="text-xs text-gray-500 tracking-wide font-medium uppercase">{props.label}</p>
        </div>
        <span class="text-xs text-gray-500 font-mono tabular-nums">
          {props.covered}
          {' / '}
          {props.total}
        </span>
      </div>
      <p class={`text-2xl font-bold tabular-nums ${hasData() ? getCoverageColorClass(displayPct()) : 'text-gray-600'}`}>
        {hasData() ? `${displayPct().toFixed(1)}%` : '—'}
      </p>
      <Show when={hasData()}>
        <CoverageBar pct={displayPct()} />
      </Show>
    </div>
  )
}

const GRID_3 = 'grid-cols-[1fr_5.5rem_5.5rem_5.5rem]'
const GRID_2 = 'grid-cols-[1fr_5.5rem_5.5rem]'

function FolderTreeItem(props: { folder: FolderNode, depth: number, hasBranches: boolean }) {
  const [expanded, setExpanded] = createSignal(true)

  const fnPct = () => computePct(props.folder.functions.covered, props.folder.functions.total)
  const lnPct = () => computePct(props.folder.lines.covered, props.folder.lines.total)
  const brPct = () => computePct(props.folder.branches.covered, props.folder.branches.total)
  const totalFiles = () => countFiles(props.folder)
  const folderIconColor = () => props.folder.lines.total <= 0 ? 'text-gray-500' : getCoverageColorClass(lnPct())

  return (
    <div>
      <div
        class={`text-xs grid cursor-pointer select-none transition-colors items-center hover:bg-white/5 ${props.hasBranches ? GRID_3 : GRID_2}`}
        style={{ 'padding-left': `${props.depth * 16 + 8}px` }}
        onClick={() => setExpanded(prev => !prev)}
      >
        <div class="py-1.5 pr-2 flex gap-1.5 min-w-0 items-center">
          <button class="text-gray-500 flex shrink-0 h-4 w-4 transition-colors items-center justify-center hover:text-gray-300">
            <div
              class="i-ph:caret-right-bold text-[10px] transition-transform duration-150"
              classList={{ 'rotate-90': expanded() }}
            />
          </button>
          <div
            class={`text-base shrink-0 ${folderIconColor()}  ${expanded() ? 'i-ph:folder-open-duotone' : 'i-ph:folder-duotone'}`}
          />
          <span class="text-gray-200 font-medium truncate">{props.folder.name}</span>
          <span class="text-[10px] text-gray-600 shrink-0">{totalFiles()}</span>
        </div>
        <CoverageCell covered={props.folder.functions.covered} total={props.folder.functions.total} pct={fnPct()} />
        <CoverageCell covered={props.folder.lines.covered} total={props.folder.lines.total} pct={lnPct()} />
        <Show when={props.hasBranches}>
          <CoverageCell covered={props.folder.branches.covered} total={props.folder.branches.total} pct={brPct()} />
        </Show>
      </div>

      <Show when={expanded()}>
        <div class="relative">
          <div
            class="bg-white/8 w-px bottom-0 top-0 absolute"
            style={{ left: `${props.depth * 16 + 19}px` }}
          />
          <For each={props.folder.folders}>
            {subfolder => (
              <FolderTreeItem folder={subfolder} depth={props.depth + 1} hasBranches={props.hasBranches} />
            )}
          </For>
          <For each={props.folder.files}>
            {file => (
              <FileRow file={file} depth={props.depth + 1} hasBranches={props.hasBranches} />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

function FileRow(props: { file: CoverageFile, depth: number, hasBranches: boolean }) {
  const fileName = () => props.file.path.split('/').pop() ?? props.file.path
  const linePct = () => normalizeMetricPct(props.file.lines.covered, props.file.lines.total, props.file.lines.pct)
  const fileIconColor = () => props.file.lines.total <= 0 ? 'text-gray-600' : getCoverageColorClass(linePct())

  return (
    <div
      class={`text-xs grid transition-colors items-center hover:bg-white/5 ${props.hasBranches ? GRID_3 : GRID_2}`}
      style={{ 'padding-left': `${props.depth * 16 + 8}px` }}
    >
      <div class="py-1.5 pr-2 flex gap-1.5 min-w-0 items-center">
        <div class="shrink-0 w-4" />
        <div class={`i-ph:file text-base shrink-0 ${fileIconColor()}`} />
        <span class="text-[11px] text-gray-400 font-mono truncate">{fileName()}</span>
      </div>
      <CoverageCell covered={props.file.functions.covered} total={props.file.functions.total} pct={props.file.functions.pct} />
      <CoverageCell covered={props.file.lines.covered} total={props.file.lines.total} pct={props.file.lines.pct} />
      <Show when={props.hasBranches}>
        <CoverageCell covered={props.file.branches.covered} total={props.file.branches.total} pct={props.file.branches.pct} />
      </Show>
    </div>
  )
}

const Coverage: Component<CoverageProps> = (props) => {
  const totals = () => props.report?.totals
  const files = () => props.report?.files ?? []
  const tree = createMemo(() => buildFolderTree(files()))
  const fileCount = createMemo(() => files().length)
  const hasBranchData = createMemo(() => {
    const summary = totals()
    return (summary?.branches.total ?? 0) > 0 || files().some(file => file.branches.total > 0)
  })

  return (
    <div class="p-6 flex flex-1 flex-col min-h-0 overflow-hidden">
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
        <div class="mx-auto flex flex-1 flex-col gap-6 max-w-5xl min-h-0 w-full">
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
                  <div class={`shrink-0 gap-3 grid grid-cols-1 ${hasBranchData() ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    <SummaryMetricCard
                      label="Functions"
                      icon="i-ph:brackets-curly-bold"
                      covered={summary().functions.covered}
                      total={summary().functions.total}
                      pct={summary().functions.pct}
                    />
                    <SummaryMetricCard
                      label="Lines"
                      icon="i-ph:list-dashes-bold"
                      covered={summary().lines.covered}
                      total={summary().lines.total}
                      pct={summary().lines.pct}
                    />
                    <Show when={hasBranchData()}>
                      <SummaryMetricCard
                        label="Branches"
                        icon="i-ph:git-branch-bold"
                        covered={summary().branches.covered}
                        total={summary().branches.total}
                        pct={summary().branches.pct}
                      />
                    </Show>
                  </div>

                  <div class="border border-white/10 rounded-lg flex flex-1 flex-col min-h-0 overflow-hidden">
                    <div
                      class={`text-xs text-gray-500 px-4 py-2.5 border-b border-white/10 bg-white/[0.02] grid items-center ${hasBranchData() ? GRID_3 : GRID_2}`}
                    >
                      <div class="flex items-center justify-between">
                        <span class="text-gray-300 font-semibold">Files</span>
                        <span>
                          {fileCount()}
                          {' '}
                          file
                          {fileCount() === 1 ? '' : 's'}
                        </span>
                      </div>
                      <span class="px-2 text-right">Funcs</span>
                      <span class="px-2 text-right">Lines</span>
                      <Show when={hasBranchData()}>
                        <span class="px-2 text-right">Branch</span>
                      </Show>
                    </div>

                    <div class="scrollbar-thin flex-1 min-h-0 overflow-auto">
                      <For each={tree().folders}>
                        {folder => (
                          <FolderTreeItem folder={folder} depth={0} hasBranches={hasBranchData()} />
                        )}
                      </For>
                      <For each={tree().rootFiles}>
                        {file => (
                          <FileRow file={file} depth={0} hasBranches={hasBranchData()} />
                        )}
                      </For>
                      <Show when={fileCount() === 0}>
                        <p class="text-sm text-gray-500 px-4 py-3">No files with coverage data.</p>
                      </Show>
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
