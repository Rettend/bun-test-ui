import { describe, expect, test } from 'bun:test'

describe('demo tests', () => {
  test('math works', () => {
    expect(1 + 2).toBe(3)
  })

  test('async workflow', async () => {
    await Bun.sleep(25)
    const items = ['a', 'b', 'c']
    expect(items.map(s => s.toUpperCase())).toEqual(['A', 'B', 'C'])
  })

  test.skip('a feature we still need to build', () => {
  })

  test('failing test', () => {
    expect(1 + 2).toBe(4)
  })

  test('slow test', async () => {
    await Bun.sleep(10000)
  })
})
