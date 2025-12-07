import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'

describe('lifecycle hooks', () => {
  const events: string[] = []

  beforeAll(() => {
    events.push('beforeAll')
  })

  beforeEach(() => {
    events.push('beforeEach')
  })

  afterEach(() => {
    events.push('afterEach')
  })

  afterAll(() => {
    events.push('afterAll')
  })

  test('records first scenario', () => {
    events.push('first')
    expect(events[0]).toBe('beforeAll')
  })

  test('records second scenario', () => {
    events.push('second')
    expect(events.filter(event => event === 'beforeEach').length).toBeGreaterThanOrEqual(2)
  })

  test('captured hook log is readable', () => {
    expect(events.includes('afterEach')).toBe(true)
    expect(events.includes('afterAll')).toBe(false)
  })
})
