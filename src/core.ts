import { VivError } from './error'

export type Headers = Record<string, string | null | undefined>
export type DefaultQuery = Record<string, string | undefined>

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  query?: Record<string, unknown>
  body?: unknown
  headers?: Headers
  timeout?: number
  signal?: AbortSignal
}

export class APIClient {
  private apiKey: string
  private baseURL: string
  private timeout: number
  private maxRetries: number
  private defaultHeaders: Headers
  private defaultQuery: DefaultQuery

  constructor({
    apiKey,
    baseURL,
    timeout,
    maxRetries,
    defaultHeaders,
    defaultQuery,
  }: {
    apiKey: string
    baseURL: string
    timeout: number
    maxRetries: number
    defaultHeaders: Headers
    defaultQuery: DefaultQuery
  }) {
    this.apiKey = apiKey
    this.baseURL = baseURL
    this.timeout = timeout
    this.maxRetries = maxRetries
    this.defaultHeaders = defaultHeaders
    this.defaultQuery = defaultQuery
  }

  async stream({
    method,
    path,
    query = {},
    body,
    headers = {},
    timeout = this.timeout,
    signal,
  }: RequestOptions): Promise<ReadableStream> {
    const url = new URL(path, this.baseURL)

    const queryParams = { ...this.defaultQuery, ...query }
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, String(value))
      }
    })

    const requestHeaders: Headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'text/event-stream',
      ...this.defaultHeaders,
      ...headers,
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders as Record<string, string>,
      signal,
    }

    if (body) {
      requestOptions.body = JSON.stringify(body)
    }

    let response: Response | null = null
    let error: Error | null = null
    let retries = 0

    while (retries < this.maxRetries) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const requestSignal = signal || controller.signal

        response = await fetch(url.toString(), {
          ...requestOptions,
          signal: requestSignal,
        })

        clearTimeout(timeoutId)
        // 5xx errors retry
        if (response.status >= 500 && response.status < 600) {
          retries++
          if (retries <= this.maxRetries) {
            await new Promise((resolve) => {
              setTimeout(resolve, Math.pow(2, retries) * 100)
            })
          }
        }
        break
      } catch (err) {
        error = err as Error
        if (error?.name === 'AbortError' && !signal) {
          error = new VivError('Request timed out')
        }
        if (signal?.aborted) {
          throw new VivError('Request aborted')
        }
        throw error
      }
    }

    if (!response) {
      throw error || new VivError('Unknown error')
    }

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        errorData = {
          error: { message: (await response.text()) || 'Unknown error' },
        }
        throw new VivError(errorData.error.message)
      }
    }

    if (!response.body) {
      throw new VivError('Response body is empty')
    }

    return response.body
  }
}
