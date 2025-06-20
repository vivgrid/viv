/*
 * Copyright 2025 Allegro US, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
