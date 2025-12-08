import type { Component } from 'solid-js'
import { createSignal, onCleanup } from 'solid-js'

export interface HourglassSpinnerProps {
  class?: string
}

const statesNormal = [
  'i-ph:hourglass-duotone',
  'i-ph:hourglass-high-duotone',
  'i-ph:hourglass-medium-duotone',
  'i-ph:hourglass-low-duotone',
]

const statesFlipped = [
  'i-ph:hourglass-duotone',
  'i-ph:hourglass-low-duotone',
  'i-ph:hourglass-medium-duotone',
  'i-ph:hourglass-high-duotone',
]

const HourglassSpinner: Component<HourglassSpinnerProps> = (props) => {
  const [frame, setFrame] = createSignal(0)
  const [flipCount, setFlipCount] = createSignal(0)

  const currentIcon = () => {
    const isFlipped = flipCount() % 2 === 1
    const states = isFlipped ? statesFlipped : statesNormal
    return states[frame()]
  }

  const rotation = () => flipCount() * 180

  const interval = setInterval(() => {
    setFrame((prev) => {
      const next = (prev + 1) % statesNormal.length
      if (next === 0)
        setFlipCount(f => f + 1)

      return next
    })
  }, 300)

  onCleanup(() => clearInterval(interval))

  return (
    <div
      class={`${currentIcon()}  ${props.class ?? ''}`}
      style={{
        transform: `rotate(${rotation()}deg)`,
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  )
}

export default HourglassSpinner
