import { describe, expect, test } from 'bun:test'

async function wait(label: string, ms: number, log: string[]) {
  await Bun.sleep(ms)
  log.push(label)
  return label
}

async function retry<T>(fn: (attempt: number) => Promise<T>, attempts: number) {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt)
    }
    catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error('retry: failed without error')
}

describe('async orchestration', () => {
  test('runs tasks in parallel based on delay', async () => {
    const log: string[] = []

    await Promise.all([
      wait('slow', 15, log),
      wait('fast', 2, log),
      wait('medium', 8, log),
    ])

    expect(log).toEqual(['fast', 'medium', 'slow'])
  })

  test('serial runner preserves order', async () => {
    const log: string[] = []
    const tasks = [
      () => wait('first', 5, log),
      () => wait('second', 5, log),
      () => wait('third', 5, log),
    ]

    for (const task of tasks)
      await task()

    expect(log).toEqual(['first', 'second', 'third'])
  })

  test('retries transient failures then succeeds', async () => {
    let attempts = 0
    const result = await retry(async (attempt) => {
      attempts = attempt
      if (attempt < 3)
        throw new Error('not yet')

      return 'ok'
    }, 5)

    expect(result).toBe('ok')
    expect(attempts).toBe(3)
  })

  test.skip('end-to-end inspector session', async () => {
    await Bun.sleep(1)
  })

  test('intentional async failure for UI smoke', async () => {
    const value = await Promise.resolve('actual-value')
    expect(value).toBe('expected-value')
  })
})
