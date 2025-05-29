import { VivError } from './error'

export const validatePositiveInteger = (name: string, n: unknown): number => {
  if (typeof n !== 'number' || !Number.isInteger(n)) {
    throw new VivError(`${name} must be an integer`)
  }
  if (n < 0) {
    throw new VivError(`${name} must be a positive integer`)
  }
  return n
}

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const parseChunk = (
  chunk: string,
): { type: string; data: unknown } | null => {
  if (!chunk.trim()) return null

  const match = chunk.match(/^([a-z]): (.+)$/)
  if (!match) return null

  const [, type, data] = match

  try {
    return { type, data: JSON.parse(data) }
  } catch {
    return { type, data }
  }
}
