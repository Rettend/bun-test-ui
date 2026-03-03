import type { CoverageReport } from '~/components/types'
import { fireEvent, screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import Coverage from '~/components/panels/Coverage'
import { render } from '../../../setup/render'

const mockReport: CoverageReport = {
  enabled: true,
  dir: 'coverage',
  totals: {
    lines: { covered: 80, total: 100, pct: 80 },
    functions: { covered: 8, total: 10, pct: 80 },
    branches: { covered: 4, total: 10, pct: 40 },
  },
  files: [
    {
      path: 'src/a.ts',
      lines: { covered: 50, total: 50, pct: 100 },
      functions: { covered: 5, total: 5, pct: 100 },
      branches: { covered: 2, total: 2, pct: 100 },
    },
    {
      path: 'src/utils/b.ts',
      lines: { covered: 30, total: 50, pct: 60 },
      functions: { covered: 3, total: 5, pct: 60 },
      branches: { covered: 2, total: 8, pct: 25 },
    },
    {
      path: 'src/utils/empty.ts',
      lines: { covered: 0, total: 0, pct: 100 },
      functions: { covered: 0, total: 0, pct: 100 },
      branches: { covered: 0, total: 0, pct: 100 },
    },
  ],
}

describe('Coverage Panel', () => {
  test('renders disabled state', () => {
    const { container, unmount } = render(() => (
      <Coverage report={null} phase="done" enabled={false} dir="coverage" />
    ))

    expect(screen.getByText('No coverage data from Bun')).toBeTruthy()
    expect(container.innerHTML).toContain('chart-pie-slice-duotone')

    unmount()
  })

  test('renders running state', () => {
    const { container, unmount } = render(() => (
      <Coverage report={null} phase="running" enabled={true} dir="coverage" />
    ))

    expect(screen.getByText('Collecting coverage...')).toBeTruthy()
    expect(container.innerHTML).toContain('animate-spin')

    unmount()
  })

  test('renders no-data state when enabled but no report yet', () => {
    const { container, unmount } = render(() => (
      <Coverage report={null} phase="done" enabled={true} dir="coverage" />
    ))

    expect(container.textContent).toContain('No coverage report available yet')
    expect(container.textContent).toContain('coverage/lcov.info')

    unmount()
  })

  test('renders coverage cards and file tree', async () => {
    const { unmount } = render(() => (
      <Coverage report={mockReport} phase="done" enabled={true} dir="coverage" />
    ))

    // Summary Cards
    expect(screen.getByText('Functions')).toBeTruthy()
    expect(screen.getAllByText('Lines').length).toBeGreaterThan(0)
    expect(screen.getByText('Branches')).toBeTruthy()

    // 80/100 lines = 80.0%
    expect(screen.getByText('80 / 100')).toBeTruthy()
    // Find percentage texts (since multiple have 80.0%, query all and assert)
    const eightyPcts = screen.getAllByText('80.0%')
    expect(eightyPcts.length).toBeGreaterThan(0)

    // Folders
    expect(screen.getByText('src')).toBeTruthy()
    expect(screen.getByText('utils')).toBeTruthy()

    // Files
    expect(screen.getByText('a.ts')).toBeTruthy()
    expect(screen.getByText('b.ts')).toBeTruthy()
    expect(screen.getByText('empty.ts')).toBeTruthy()

    // Expand/Collapse folder
    const srcRow = screen.getByText('src').closest('div')
    if (srcRow) {
      fireEvent.click(srcRow)
      await Promise.resolve()
      // should still be visible, we're just checking that clicking doesn't crash and toggles internal state
      expect(screen.getByText('src')).toBeTruthy()
    }

    unmount()
  })

  test('renders without branch data if missing globally', () => {
    const noBranchReport: CoverageReport = {
      enabled: true,
      dir: 'coverage',
      totals: {
        lines: { covered: 80, total: 100, pct: 80 },
        functions: { covered: 8, total: 10, pct: 80 },
        branches: { covered: 0, total: 0, pct: 100 },
      },
      files: [
        {
          path: 'src/a.ts',
          lines: { covered: 80, total: 100, pct: 80 },
          functions: { covered: 8, total: 10, pct: 80 },
          branches: { covered: 0, total: 0, pct: 100 },
        },
      ],
    }

    const { unmount } = render(() => (
      <Coverage report={noBranchReport} phase="done" enabled={true} dir="coverage" />
    ))

    // Branch card shouldn't be there
    expect(screen.queryByText('Branches')).toBeNull()
    // Branch column shouldn't be there
    expect(screen.queryByText('Branch')).toBeNull()

    unmount()
  })
})
