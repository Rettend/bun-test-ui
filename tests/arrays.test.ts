import { describe, expect, test } from 'bun:test'

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0)
    throw new Error('size must be > 0')
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size)
    result.push(arr.slice(i, i + size))

  return result
}

function groupBy<T, K extends string | number | symbol>(
  items: T[],
  selector: (item: T) => K,
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = selector(item)
    acc[key] ??= []
    acc[key].push(item)
    return acc
  }, {} as Record<K, T[]>)
}

describe('array helpers', () => {
  test('chunks evenly sized arrays', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  test('chunks handle trailing elements', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  test('groupBy collects items by field', () => {
    const grouped = groupBy(
      [
        { id: 1, scope: 'unit' },
        { id: 2, scope: 'integration' },
        { id: 3, scope: 'unit' },
      ],
      item => item.scope,
    )

    const { unit = [], integration = [] } = grouped

    expect(unit.map(i => i.id)).toEqual([1, 3])
    expect(integration.map(i => i.id)).toEqual([2])
  })

  test('flatten keeps stable ordering', () => {
    const nested = [
      ['a', 'b'],
      ['c'],
      [],
      ['d', 'e'],
    ]
    expect(nested.flat()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  test.todo('stream large arrays to inspector panes without freezing', () => {
    // placeholder to keep type checker satisfied while remaining todo
  })
})
