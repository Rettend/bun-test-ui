import type { Component, JSX } from 'solid-js'
import { createMemo, createSignal, onCleanup, onMount } from 'solid-js'

export interface SplitPaneProps {
  /** Content for the left/first pane */
  left: JSX.Element
  /** Content for the right/second pane */
  right: JSX.Element
  /** Initial width of the left pane in pixels */
  initialWidth?: number
  /** Minimum width of the left pane in pixels */
  minWidth?: number
  /** Maximum width of the left pane in pixels */
  maxWidth?: number
  /** Storage key for persisting width */
  storageKey?: string
}

const SplitPane: Component<SplitPaneProps> = (props) => {
  const minWidth = createMemo(() => props.minWidth ?? 180)
  const maxWidth = createMemo(() => props.maxWidth ?? 600)
  const defaultWidth = createMemo(() => props.initialWidth ?? 256)

  // Load from localStorage if available
  const getInitialWidth = (): number => {
    if (props.storageKey) {
      const stored = localStorage.getItem(props.storageKey)
      if (stored) {
        const parsed = Number.parseInt(stored, 10)
        if (!Number.isNaN(parsed))
          return Math.max(minWidth(), Math.min(maxWidth(), parsed))
      }
    }
    return defaultWidth()
  }

  const [width, setWidth] = createSignal(getInitialWidth())
  const [isDragging, setIsDragging] = createSignal(false)
  let containerRef: HTMLDivElement | undefined

  // Save to localStorage when width changes
  const saveWidth = (w: number) => {
    if (props.storageKey)
      localStorage.setItem(props.storageKey, String(w))
  }

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging() || !containerRef)
      return

    const rect = containerRef.getBoundingClientRect()
    const newWidth = e.clientX - rect.left
    const clampedWidth = Math.max(minWidth(), Math.min(maxWidth(), newWidth))

    setWidth(clampedWidth)
  }

  const handleMouseUp = () => {
    if (isDragging()) {
      setIsDragging(false)
      saveWidth(width())
    }
  }

  const handleDblClick = () => {
    const w = defaultWidth()
    setWidth(w)
    saveWidth(w)
  }

  onMount(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  })

  onCleanup(() => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  })

  return (
    <div
      ref={containerRef}
      class="flex flex-1 overflow-hidden"
      classList={{ 'select-none': isDragging() }}
    >
      {/* Left pane */}
      <div
        class="shrink-0 overflow-hidden"
        style={{ width: `${width()}px` }}
      >
        {props.left}
      </div>

      {/* Resize handle */}
      <div
        class="group flex w-1 cursor-col-resize transition-colors items-center justify-center relative z-10"
        classList={{
          'bg-pink-500/50': isDragging(),
          'hover:bg-pink-500/30': !isDragging(),
        }}
        onMouseDown={handleMouseDown}
        onDblClick={handleDblClick}
      >
        {/* Visual indicator on hover/drag */}
        <div
          class="h-full w-0.5 transition-all duration-150"
          classList={{
            'bg-pink-500': isDragging(),
            'group-hover:bg-pink-500/50': !isDragging(),
          }}
        />
        {/* Invisible wider hit area */}
        <div class="inset-y-0 absolute -left-1 -right-1" />
      </div>

      {/* Right pane */}
      <div class="flex-1 overflow-hidden">
        {props.right}
      </div>
    </div>
  )
}

export default SplitPane
