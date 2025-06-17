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

import type { ClientOptions, CompletionResponse, RequestOptions } from './types'
import { Stream } from './streaming'
import { delay } from './core'
import { validatePositiveInteger } from './core'
import {
  calculateRetryDelay,
  createAPIError,
  shouldRetryError,
  VivAPIError,
  VivError,
} from './error'

export class Viv {
  private apiKey: string
  private baseURL: string
  private maxRetries: number
  private retryDelay: number
  private defaultHeaders: Record<string, string>
  private defaultQuery: Record<string, string>

  constructor({
    apiKey,
    baseURL = 'https://api.vivgrid.com/v1',
    maxRetries = 3,
    retryDelay = 1000,
    defaultHeaders = {},
    defaultQuery = {},
  }: ClientOptions) {
    this.apiKey = apiKey
    this.baseURL = baseURL
    this.maxRetries = validatePositiveInteger('maxRetries', maxRetries)
    this.retryDelay = validatePositiveInteger('retryDelay', retryDelay)
    this.defaultHeaders = defaultHeaders
    this.defaultQuery = defaultQuery
  }

  /**
   * Chat completions API
   */
  chat = {
    completions: {
      /**
       * Create a chat completion (non-streaming)
       */
      create: async (options: RequestOptions): Promise<CompletionResponse> => {
        return this.makeCreateRequest(options)
      },
      /**
       * Stream chat completions
       */
      stream: async (options: RequestOptions): Promise<Stream> => {
        const stream = new Stream()

        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            stream.abort()
          })
        }

        this.makeStreamRequest(options, stream).catch((error) => {
          stream.emit('error', error)
        })

        return stream
      },
    },
  }

  /**
   * Make a non-streaming request to the Vivgrid API with retry logic
   */
  private async makeCreateRequest(
    options: RequestOptions,
    retryCount = 0,
  ): Promise<CompletionResponse> {
    try {
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${this.apiKey}`,
        ...this.defaultHeaders,
      }
      let url = `${this.baseURL}/chat/completions`
      if (this.defaultQuery && Object.keys(this.defaultQuery).length > 0) {
        url += `?${new URLSearchParams(this.defaultQuery)}`
      }
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
        signal: options.signal,
      })
      if (!response.ok) {
        const errorText = await response.text()
        const error = new Error(
          `API request failed with status ${response.status}: ${errorText}`,
        )
        throw createAPIError(error, response)
      }
      const result = await response.json()
      return result as CompletionResponse
    } catch (error) {
      const { shouldRetry, errorType } = shouldRetryError(error)
      if (!shouldRetry || retryCount >= this.maxRetries) {
        if (error instanceof VivAPIError) {
          throw error
        }
        throw createAPIError(error)
      }

      const retryDelay = calculateRetryDelay(
        this.retryDelay,
        retryCount,
        errorType,
      )

      console.warn(
        `Request failed with ${errorType || 'unknown error'}, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${this.maxRetries})`,
      )

      await delay(retryDelay)
      return this.makeCreateRequest(options, retryCount + 1)
    }
  }
  /**
   * Make a streaming request to the Vivgrid API with retry logic
   */
  private async makeStreamRequest(
    options: RequestOptions,
    stream: Stream,
    retryCount = 0,
  ): Promise<void> {
    try {
      let url = `${this.baseURL}/chat/completions`
      if (this.defaultQuery && Object.keys(this.defaultQuery).length > 0) {
        url += `?${new URLSearchParams(this.defaultQuery)}`
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Response-Format': 'vivgrid',
          Accept: 'text/event-stream',
          ...this.defaultHeaders,
        },
        body: JSON.stringify({ ...options, stream: true }),
        signal: stream.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        const error = new Error(
          `API request failed with status ${response.status}: ${errorText}`,
        )
        throw createAPIError(error, response)
      }

      if (!response.body) {
        throw new VivError('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          if (buffer.trim()) {
            stream.processChunk(buffer)
          }

          stream.emit('end')
          break
        }

        const text = decoder.decode(value, { stream: true })
        buffer += text

        const chunks = buffer.split('\n\n')

        buffer = chunks.pop() || ''

        for (const chunk of chunks) {
          if (chunk.trim()) {
            stream.processChunk(chunk)
          }
        }
      }
    } catch (error) {
      const { shouldRetry, errorType } = shouldRetryError(error)

      if (!shouldRetry || retryCount >= this.maxRetries) {
        const apiError =
          error instanceof VivAPIError ? error : createAPIError(error)
        stream.emit('error', apiError)
        return
      }

      const retryDelay = calculateRetryDelay(
        this.retryDelay,
        retryCount,
        errorType,
      )

      console.warn(
        `Stream request failed with ${errorType || 'unknown error'}, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${this.maxRetries})`,
      )

      await delay(retryDelay)
      return this.makeStreamRequest(options, stream, retryCount + 1)
    }
  }
}
