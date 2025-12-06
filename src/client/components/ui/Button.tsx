import type { Component, JSX } from 'solid-js'

export interface ButtonProps {
  children: JSX.Element
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses = {
  primary: 'bg-#f472b6 text-gray-900 font-medium hover:bg-#f9a8d4 disabled:opacity-50',
  secondary: 'bg-white/5 text-gray-200 font-medium hover:bg-white/10 disabled:opacity-50',
  ghost: 'text-gray-400 hover:text-gray-200 hover:bg-white/5 disabled:opacity-50',
}

const sizeClasses = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-4 py-1.5 text-sm',
  lg: 'px-5 py-2 text-base',
}

const Button: Component<ButtonProps> = (props) => {
  const variant = () => props.variant ?? 'primary'
  const size = () => props.size ?? 'md'

  return (
    <button
      class={`rounded-xl transition-all duration-200 ${variantClasses[variant()]}  ${sizeClasses[size()]}`}
      onClick={() => props.onClick?.()}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}

export default Button
