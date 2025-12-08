import type { Component } from 'solid-js'
import type { ActiveTab } from '~/components/layout/Header'
import { createSignal, Show } from 'solid-js'
import { ConsolePanel, Coverage, Dashboard, Header, ProgressBar, SplitPane, TestDetails, TestExplorer } from '~/components'
import { createTestRunner } from '~/runner'

const App: Component = () => {
  const runner = createTestRunner()
  const [activeTab, setActiveTab] = createSignal<ActiveTab>('dashboard')

  return (
    <div class="text-gray-400 font-sans bg-#14141b flex flex-col h-screen antialiased">
      <ProgressBar summary={runner.summary()} />
      <Header
        connection={runner.connection()}
        phase={runner.phase()}
        activeTab={runner.selectedId() ? null : activeTab()}
        summary={runner.summary()}
        onRunTests={runner.runTests}
        onTabChange={(tab) => {
          setActiveTab(tab)
          runner.setSelectedId(null)
        }}
      />

      <SplitPane
        initialWidth={256}
        minWidth={180}
        maxWidth={500}
        storageKey="test-explorer-width"
        left={(
          <TestExplorer
            roots={runner.roots()}
            tests={runner.tests}
            selectedId={runner.selectedId()}
            onSelect={runner.setSelectedId}
            onRunTest={runner.runTest}
            summary={runner.summary()}
          />
        )}
        right={(
          <main class="bg-#14141b flex flex-1 flex-col h-full overflow-auto">
            <Show
              when={runner.selectedTest()}
              fallback={(
                <Show when={activeTab() === 'coverage'} fallback={<Dashboard summary={runner.summary()} phase={runner.phase()} />}>
                  <Coverage />
                </Show>
              )}
            >
              {test => (
                <div class="p-4 space-y-4">
                  <TestDetails
                    test={test()}
                    tests={runner.tests}
                    consoleEntries={runner.consoleEntries()}
                    onNavigate={runner.setSelectedId}
                  />
                  <ConsolePanel entries={runner.consoleEntries()} />
                </div>
              )}
            </Show>
          </main>
        )}
      />
    </div>
  )
}

export default App
