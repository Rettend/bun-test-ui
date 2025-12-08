import type { Component } from 'solid-js'

const Coverage: Component = () => {
  return (
    <div class="p-6 flex flex-1 items-center justify-center">
      <div class="text-center space-y-4">
        <div class="i-ph:chart-pie-slice-duotone text-6xl text-gray-600 mx-auto" />
        <div class="space-y-2">
          <p class="text-gray-400 font-medium">Coverage</p>
          <p class="text-sm text-gray-600 relative">
            Soon
            <sup class="text-10px right-1 top-1 absolute">TM</sup>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Coverage
