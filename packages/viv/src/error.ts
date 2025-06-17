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

export class VivError extends Error {}

export type RetryableErrorType =
  | 'server_error'
  | 'rate_limit'
  | 'timeout'
  | 'network_error'

export function shouldRetryError(error: unknown): {
  shouldRetry: boolean
  errorType?: RetryableErrorType
} {
  if (!error) {
    return { shouldRetry: false }
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return { shouldRetry: false }
  }

  if (
    error instanceof Error &&
    error.message.includes('API request failed with status')
  ) {
    const statusMatch = error.message.match(/status (\d+)/)
    if (statusMatch) {
      const status = Number.parseInt(statusMatch[1], 10)

      // 5xx server errors - retry
      if (status >= 500 && status <= 599) {
        return { shouldRetry: true, errorType: 'server_error' }
      }

      // 429 rate limit - retry
      if (status === 429) {
        return { shouldRetry: true, errorType: 'rate_limit' }
      }

      return { shouldRetry: false }
    }
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase()

    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('network timeout') ||
      errorMessage.includes('request timeout') ||
      error.name === 'TimeoutError'
    ) {
      return { shouldRetry: true, errorType: 'timeout' }
    }

    if (
      errorMessage.includes('network error') ||
      errorMessage.includes('connection error') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('network request failed') ||
      error.name === 'NetworkError'
    ) {
      return { shouldRetry: true, errorType: 'network_error' }
    }
  }

  if (error instanceof TypeError) {
    const errorMessage = error.message.toLowerCase()
    if (
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('network request failed') ||
      errorMessage.includes('load failed')
    ) {
      return { shouldRetry: true, errorType: 'network_error' }
    }
  }

  return { shouldRetry: false }
}

export function calculateRetryDelay(
  baseDelay: number,
  retryCount: number,
  errorType?: RetryableErrorType,
  jitter = true,
): number {
  let delay = baseDelay * Math.pow(2, retryCount)

  switch (errorType) {
    case 'rate_limit':
      delay = Math.max(delay, 5000)
      break
    case 'server_error':
      break
    case 'timeout':
      delay = delay * 1.5
      break
    case 'network_error':
      break
  }

  if (jitter) {
    delay = delay + Math.random() * 1000
  }

  return Math.min(delay, 30000)
}

export class VivAPIError extends Error {
  public readonly status?: number
  public readonly errorType?: RetryableErrorType
  public readonly retryable: boolean

  constructor(
    message: string,
    status?: number,
    errorType?: RetryableErrorType,
    retryable = false,
  ) {
    super(message)
    this.name = 'VivAPIError'
    this.status = status
    this.errorType = errorType
    this.retryable = retryable
  }
}

export function createAPIError(
  error: unknown,
  response?: Response,
): VivAPIError {
  if (error instanceof VivAPIError) {
    return error
  }

  let message = 'Unknown API error'
  let status: number | undefined

  if (response) {
    status = response.status
    message = `API request failed with status ${status}`
  } else if (error instanceof Error) {
    message = error.message
  }

  const { shouldRetry, errorType: detectedType } = shouldRetryError(error)

  return new VivAPIError(message, status, detectedType, shouldRetry)
}
