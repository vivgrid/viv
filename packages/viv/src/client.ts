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
import { VivError } from './error'

export class Viv {
  private apiKey: string
  private baseURL: string
  private maxRetries: number
  private retryDelay: number

  constructor({
    apiKey,
    baseURL = 'https://api.vivgrid.com/v1',
    maxRetries = 3,
    retryDelay = 1000,
  }: ClientOptions) {
    this.apiKey = apiKey
    this.baseURL = baseURL
    this.maxRetries = validatePositiveInteger('maxRetries', maxRetries)
    this.retryDelay = validatePositiveInteger('retryDelay', retryDelay)
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
      }
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new VivError(
          `API request failed with status ${response.status}: ${errorText}`,
        )
      }
      const result = await response.json()
      return result as CompletionResponse
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const waitTime = this.retryDelay * Math.pow(2, retryCount)
        await delay(waitTime)
        return this.makeCreateRequest(options, retryCount + 1)
      }
      throw error
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
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Response-Format': 'vivgrid',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ ...options, stream: true }),
        signal: stream.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new VivError(
          `API request failed with status ${response.status}: ${errorText}`,
        )
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
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      if (retryCount < this.maxRetries) {
        const waitTime = this.retryDelay * Math.pow(2, retryCount)
        await delay(waitTime)
        return this.makeStreamRequest(options, stream, retryCount + 1)
      }

      throw error
    }
  }
}
