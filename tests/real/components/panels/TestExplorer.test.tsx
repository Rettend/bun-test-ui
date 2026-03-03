import type { TestNode, TestSummary } from '~/components/types'
import { fireEvent, screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import TestExplorer from '~/components/panels/TestExplorer'
import { render } from '../../../setup/render'

const mockSummary: TestSummary = {
  total: 2,
  passed: 1,
  failed: 1,
  skipped: 0,
  running: 0,
  duration: 100,
}

describe('TestExplorer', () => {
  test('renders empty state when no tests', () => {
    const { unmount } = render(() => (
      <TestExplorer
        roots={[]}
        tests={{}}
        selectedId={null}
        onSelect={() => {}}
        summary={mockSummary}
      />
    ))

    expect(screen.getByText('Test Explorer')).toBeTruthy()
    expect(screen.getByText('2 tests')).toBeTruthy()
    expect(screen.getByText('No tests yet. Run tests to populate.')).toBeTruthy()

    unmount()
  })

  test('renders roots and delegates selection', async () => {
    const tests: Record<string, TestNode> = {
      root1: {
        id: 'root1',
        name: 'Root test suite',
        type: 'describe',
        status: 'failed',
        children: ['child1'],
      },
      child1: {
        id: 'child1',
        name: 'Child test',
        type: 'test',
        status: 'failed',
        duration: 15,
        children: [],
        parentId: 'root1',
      },
    }

    let selected = ''
    let runTestId = ''

    const { unmount } = render(() => (
      <TestExplorer
        roots={['root1']}
        tests={tests}
        selectedId={null}
        onSelect={id => selected = id}
        onRunTest={id => runTestId = id}
        summary={mockSummary}
      />
    ))

    // Finds root name
    expect(screen.getByText('Root test suite')).toBeTruthy()
    // It should render children initially expanded in TestTreeItem
    expect(screen.getByText('Child test')).toBeTruthy()

    // Click on the child item row to select
    const childRow = screen.getByText('Child test').closest('div')
    if (childRow) {
      fireEvent.click(childRow)
      await Promise.resolve()
      expect(selected).toBe('child1')
    }

    // Emulate hover to show play button on root item, then click it
    const rootRow = screen.getByText('Root test suite').closest('div')
    if (rootRow) {
      fireEvent.mouseEnter(rootRow)
      await Promise.resolve()

      const playBtn = rootRow.querySelector('[data-play-btn]')
      if (playBtn) {
        fireEvent.click(playBtn)
        await Promise.resolve()
        expect(runTestId).toBe('root1')
      }
    }

    unmount()
  })
})
