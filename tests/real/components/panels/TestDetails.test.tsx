import type { ConsoleEntry, TestNode } from '~/components/types'
import { fireEvent, screen } from '@testing-library/dom'
import { describe, expect, test } from 'bun:test'
import TestDetails from '~/components/panels/TestDetails'
import { render } from '../../../setup/render'

const mockTests: Record<string, TestNode> = {
  'root': {
    id: 'root',
    name: 'Root Suite',
    type: 'describe',
    status: 'failed',
    children: ['child1', 'child-error'],
  },
  'child1': {
    id: 'child1',
    name: 'Child Test',
    type: 'test',
    status: 'passed',
    duration: 42,
    children: [],
    parentId: 'root',
    url: '/src/file.ts',
    line: 10,
  },
  'child-error': {
    id: 'child-error',
    name: 'Error Test',
    type: 'test',
    status: 'failed',
    children: [],
    parentId: 'root',
    error: 'Error: Something went wrong\n  at /src/file.ts:15',
  },
}

const mockConsole: ConsoleEntry[] = [
  { id: 1, testId: 'child1', level: 'log', message: 'Log message', timestamp: Date.now() },
  { id: 2, testId: 'child1', level: 'warn', message: 'Warning message', timestamp: Date.now() },
  { id: 3, testId: 'child1', level: 'error', message: 'Error message', timestamp: Date.now() },
]

describe('TestDetails', () => {
  test('renders test details and breadcrumbs', () => {
    let navigatedTo: string | null = null

    const { unmount } = render(() => (
      <TestDetails
        test={mockTests.child1!}
        tests={mockTests}
        onNavigate={id => navigatedTo = id}
      />
    ))

    expect(screen.getAllByText('Child Test').length).toBeGreaterThan(0)
    expect(screen.getAllByText('42ms').length).toBeGreaterThan(0)
    expect(screen.getByText('/src/file.ts:10')).toBeTruthy()

    // Breadcrumbs
    expect(screen.getByText('Root Suite')).toBeTruthy()
    expect(screen.getByText('Child Test', { selector: 'button' })).toBeTruthy()

    // Navigate up
    fireEvent.click(screen.getByText('Root Suite'))
    expect(navigatedTo).toBe('root')

    unmount()
  })

  test('renders suite children and child errors', () => {
    let navigatedTo: string | null = null

    const { unmount } = render(() => (
      <TestDetails
        test={mockTests.root!}
        tests={mockTests}
        onNavigate={id => navigatedTo = id}
      />
    ))

    expect(screen.getByText('Root Suite')).toBeTruthy()

    // Children list
    expect(screen.getByText('Tests (2)')).toBeTruthy()
    expect(screen.getAllByText('Child Test').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Error Test').length).toBeGreaterThan(0)

    // Errors list
    expect(screen.getByText('Errors (1)')).toBeTruthy()
    expect(container.textContent).toContain('Error: Something went wrong')

    // Navigate to child error
    const errorLink = container.querySelector('.text-red-300') as HTMLButtonElement
    fireEvent.click(errorLink)
    expect(navigatedTo).toBe('child-error')

    unmount()
  })

  test('renders console output', () => {
    const { unmount } = render(() => (
      <TestDetails
        test={mockTests.child1!}
        tests={mockTests}
        consoleEntries={mockConsole}
        onNavigate={() => {}}
      />
    ))

    expect(screen.getByText('Console Output')).toBeTruthy()
    expect(screen.getByText('3 entries')).toBeTruthy()

    expect(screen.getByText('Log message')).toBeTruthy()
    expect(screen.getByText('Warning message')).toBeTruthy()
    expect(screen.getByText('Error message')).toBeTruthy()

    unmount()
  })

  test('renders standalone test error', () => {
    const { unmount } = render(() => (
      <TestDetails
        test={mockTests['child-error']!}
        tests={mockTests}
        onNavigate={() => {}}
      />
    ))

    // For a test (not suite) it shows its own error block
    expect(screen.getByText('Error')).toBeTruthy()
    expect(container.textContent).toContain('Error: Something went wrong')

    unmount()
  })

  test('renders correct status colors', () => {
    const customTest: TestNode = { id: 'x', name: 'X', type: 'test', status: 'skipped', children: [] }
    const { unmount } = render(() => (
      <TestDetails test={customTest} tests={{ x: customTest }} onNavigate={() => {}} />
    ))

    expect(container.innerHTML).toContain('bg-gray-500/10')
    expect(container.innerHTML).toContain('text-gray-400')
    unmount()
  })
})
