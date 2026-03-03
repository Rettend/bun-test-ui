import type { TestNode } from '~/components/types'
import { fireEvent, screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import TestTreeItem from '~/components/panels/TestTreeItem'
import { render } from '../../../setup/render'

const store: Record<string, TestNode> = {
  'root': {
    id: 'root',
    name: 'Root Test',
    type: 'describe',
    status: 'failed',
    children: ['child-passed', 'child-failed', 'child-timeout'],
  },
  'child-passed': {
    id: 'child-passed',
    name: 'Passed Test',
    type: 'test',
    status: 'passed',
    duration: 10,
    children: [],
    parentId: 'root',
  },
  'child-failed': {
    id: 'child-failed',
    name: 'Failed Test',
    type: 'test',
    status: 'failed',
    duration: 15,
    children: [],
    parentId: 'root',
  },
  'child-timeout': {
    id: 'child-timeout',
    name: 'Timeout Test',
    type: 'test',
    status: 'timeout',
    duration: 5100,
    children: [],
    parentId: 'root',
  },
}

describe('TestTreeItem', () => {
  test('renders item with duration and children counts', () => {
    const { unmount } = render(() => (
      <TestTreeItem
        id="root"
        store={store}
        onSelect={() => {}}
      />
    ))

    expect(screen.getByText('Root Test')).toBeTruthy()
    // It should render children count (3)
    expect(screen.getByText('3')).toBeTruthy()

    // It should render expanded children
    expect(screen.getByText('Passed Test')).toBeTruthy()
    expect(screen.getByText('10ms')).toBeTruthy()

    expect(screen.getByText('Failed Test')).toBeTruthy()
    expect(screen.getByText('15ms')).toBeTruthy()

    expect(screen.getByText('Timeout Test')).toBeTruthy()
    expect(screen.getByText('5.10s')).toBeTruthy()

    unmount()
  })

  test('toggles expanded state on chevron click', async () => {
    const { container, unmount } = render(() => (
      <TestTreeItem
        id="root"
        store={store}
        onSelect={() => {}}
      />
    ))

    // Root should be initially expanded
    expect(screen.getByText('Passed Test')).toBeTruthy()

    // Find the chevron button
    const chevronBtn = container.querySelector('button') as HTMLButtonElement
    fireEvent.click(chevronBtn)
    await Promise.resolve()

    // Children should be hidden
    expect(screen.queryByText('Passed Test')).toBeNull()

    // Click again to expand
    fireEvent.click(chevronBtn)
    await Promise.resolve()
    expect(screen.getByText('Passed Test')).toBeTruthy()

    unmount()
  })

  test('calls onSelect when row is clicked, unless play button is clicked', async () => {
    let selectedId = ''
    let runId = ''

    const { unmount } = render(() => (
      <TestTreeItem
        id="child-failed"
        store={store}
        selectedId="root"
        onSelect={id => selectedId = id}
        onRunTest={id => runId = id}
      />
    ))

    const row = screen.getByText('Failed Test').closest('div') as HTMLDivElement

    // Hover row to make play button visible
    fireEvent.mouseEnter(row)
    await Promise.resolve()

    const playBtn = row.querySelector('[data-play-btn]') as HTMLButtonElement
    expect(playBtn).toBeTruthy()

    // Click play button
    fireEvent.click(playBtn)
    await Promise.resolve()
    expect(runId).toBe('child-failed')
    expect(selectedId).toBe('') // Should not select when play button is clicked

    // Click row directly
    fireEvent.click(row)
    await Promise.resolve()
    expect(selectedId).toBe('child-failed')

    // Mouse leave
    fireEvent.mouseLeave(row)
    await Promise.resolve()
    expect(row.querySelector('[data-play-btn]')).toBeNull()

    unmount()
  })

  test('applies selected background colors for different statuses', () => {
    const customStore: Record<string, TestNode> = {
      passed: { id: 'passed', name: 'Pass', type: 'test', status: 'passed', children: [] },
      failed: { id: 'failed', name: 'Fail', type: 'test', status: 'failed', children: [] },
      running: { id: 'running', name: 'Run', type: 'test', status: 'running', children: [] },
      timeout: { id: 'timeout', name: 'Time', type: 'test', status: 'timeout', children: [] },
      idle: { id: 'idle', name: 'Idle', type: 'test', status: 'idle', children: [] },
    }

    const { unmount: unmount1, container: c1 } = render(() => <TestTreeItem id="passed" store={customStore} selectedId="passed" onSelect={() => {}} />)
    expect(c1.innerHTML).toContain('bg-emerald-500/10')
    unmount1()

    const { unmount: unmount2, container: c2 } = render(() => <TestTreeItem id="failed" store={customStore} selectedId="failed" onSelect={() => {}} />)
    expect(c2.innerHTML).toContain('bg-red-500/10')
    unmount2()

    const { unmount: unmount3, container: c3 } = render(() => <TestTreeItem id="running" store={customStore} selectedId="running" onSelect={() => {}} />)
    expect(c3.innerHTML).toContain('bg-amber-500/10')
    unmount3()

    const { unmount: unmount4, container: c4 } = render(() => <TestTreeItem id="timeout" store={customStore} selectedId="timeout" onSelect={() => {}} />)
    expect(c4.innerHTML).toContain('bg-orange-500/10')
    unmount4()

    const { unmount: unmount5, container: c5 } = render(() => <TestTreeItem id="idle" store={customStore} selectedId="idle" onSelect={() => {}} />)
    expect(c5.innerHTML).toContain('bg-white/5')
    unmount5()
  })
})
