export function normalizeFilePath(url?: string): string | undefined {
  if (!url)
    return undefined
  try {
    let path = url
    if (url.startsWith('file://')) {
      const parsed = new URL(url)
      path = decodeURIComponent(parsed.pathname)
      if (path.startsWith('/') && path[2] === ':')
        path = path.slice(1)
    }
    path = path.replace(/\\/g, '/')
    return path
  }
  catch {}
  return url
}

export function escapeTestName(source: string): string {
  return source.replace(/[^\w ]/g, '\\$&')
}

export function buildTestNamePattern(paths: string[][]): string | undefined {
  if (!paths.length)
    return undefined

  const patternVariants: string[] = []

  for (const segments of paths) {
    const pathStr = segments.join(' ')
    let escaped = escapeTestName(pathStr)
    escaped = escaped.replaceAll(/\\\$\{[^}]+\}/g, '.*?')
    escaped = escaped.replaceAll(/\\%[isfd]/g, '.*?')

    patternVariants.push(`^ ${escaped}$`)
    patternVariants.push(escaped)
  }

  if (patternVariants.length === 1)
    return patternVariants[0]
  return patternVariants.map(p => `(${p})`).join('|')
}

export function coerceElapsed(elapsed: unknown): number | undefined {
  if (typeof elapsed === 'number') {
    if (Number.isFinite(elapsed))
      return elapsed
    return undefined
  }
  if (typeof elapsed === 'bigint')
    return Number(elapsed)

  if (typeof elapsed === 'string') {
    const parsed = Number(elapsed)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}
