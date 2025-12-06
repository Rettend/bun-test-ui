import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  unocss: true,
  solid: true,
  typescript: true,
  rules: {
    'no-console': 'warn',
    'curly': ['warn', 'multi-or-nest', 'consistent'],
    'antfu/no-top-level-await': 'off',
  },
  ignores: [
    'reference/**',
    'packages/bun-inspector-protocol/**',
    'packages/bun-debug-adapter-protocol/**',
  ],
})
