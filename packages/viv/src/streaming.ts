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

import { EventEmitter } from 'events'
import {
  chunkPrefixToType,
  type ChunkType,
  type FunctionCallChunk,
  type FunctionResultChunk,
  type RawChunkPrefix,
  type StreamChunkData,
  type StreamEvents,
  type StreamIteratorChunk,
  type TokenUsageChunk,
} from './types'

export class Stream
  extends EventEmitter
  implements AsyncIterable<StreamIteratorChunk>
{
  private controller: AbortController
  private connected = false
  private chunks: StreamIteratorChunk[] = []
  private waitingIterators: Array<{
    resolve: (value: IteratorResult<StreamIteratorChunk>) => void
    reject: (error: Error) => void
  }> = []
  private finished = false
  private error: Error | null = null

  constructor() {
    super()
    this.controller = new AbortController()

    this.on('chunk', (type: ChunkType, data: unknown) => {
      const chunk: StreamIteratorChunk = {
        type,
        data: data as StreamChunkData,
        raw: `${type}: ${typeof data === 'string' ? data : JSON.stringify(data)}`,
      }
      this.chunks.push(chunk)
      this.notifyWaitingIterators()
    })

    this.on('end', () => {
      this.finished = true
      this.notifyWaitingIterators()
    })

    this.on('error', (err: Error) => {
      this.error = err
      this.notifyWaitingIterators()
    })
  }
  private notifyWaitingIterators(): void {
    while (
      this.waitingIterators.length > 0 &&
      (this.chunks.length > 0 || this.finished || this.error)
    ) {
      const iterator = this.waitingIterators.shift()!

      if (this.error) {
        iterator.reject(this.error)
      } else if (this.chunks.length > 0) {
        const chunk = this.chunks.shift()!
        iterator.resolve({ value: chunk, done: false })
      } else if (this.finished) {
        iterator.resolve({ value: undefined, done: true })
      }
    }
  }
  [Symbol.asyncIterator](): AsyncIterator<StreamIteratorChunk> {
    return {
      next: (): Promise<IteratorResult<StreamIteratorChunk>> => {
        return new Promise((resolve, reject) => {
          if (this.error) {
            reject(this.error)
            return
          }

          if (this.chunks.length > 0) {
            const chunk = this.chunks.shift()!
            resolve({ value: chunk, done: false })
            return
          }

          if (this.finished) {
            resolve({ value: undefined, done: true })
            return
          }

          this.waitingIterators.push({ resolve, reject })
        })
      },

      return: async (): Promise<IteratorResult<StreamIteratorChunk>> => {
        this.abort()
        return { value: undefined, done: true }
      },
    }
  }
  processChunk(chunk: string): void {
    if (!chunk.trim()) return
    const match = chunk.match(/^([frcgup]):(.+)$/)
    if (!match) return

    try {
      const [, prefix, data] = match
      const rawPrefix = prefix as RawChunkPrefix
      const type = chunkPrefixToType[rawPrefix]

      if (!this.connected && (type === 'content' || type === 'reasoning')) {
        this.connected = true
        this.emit('connect')
      }

      switch (type) {
        case 'functionCall': {
          const functionCall = JSON.parse(data) as FunctionCallChunk
          this.emit('chunk', type, functionCall)
          this.emit('functionCall', functionCall.name, functionCall.arguments)
          break
        }
        case 'functionCallResult': {
          const functionResult = JSON.parse(data) as FunctionResultChunk
          this.emit('chunk', type, functionResult)
          this.emit(
            'functionCallResult',
            functionResult.name,
            functionResult.result,
          )
          break
        }
        case 'content': {
          const content = JSON.parse(data) as string
          this.emit('chunk', type, content)
          this.emit('content', content)
          break
        }
        case 'reasoning': {
          const reasoning = JSON.parse(data) as string
          this.emit('chunk', type, reasoning)
          this.emit('reasoning', reasoning)
          break
        }
        case 'usage': {
          const usage = JSON.parse(data) as TokenUsageChunk
          this.emit('chunk', type, usage)
          break
        }
        case 'end': {
          if (data === 'finish') {
            this.emit('chunk', type, data)
            this.emit('end')
          }
          break
        }
        default:
          this.emit('chunk', type || 'unknown', data)
      }
    } catch (error) {
      this.emit(
        'error',
        new Error(
          `Failed to process chunk: ${error instanceof Error ? error.message : String(error)}`,
        ),
      )
    }
  }
  abort(): void {
    this.controller.abort()
    this.emit('abort')
  }
  get signal(): AbortSignal {
    return this.controller.signal
  }
  on<K extends keyof StreamEvents>(event: K, listener: StreamEvents[K]): this {
    return super.on(event, listener as (...args: unknown[]) => void)
  }
  once<K extends keyof StreamEvents>(
    event: K,
    listener: StreamEvents[K],
  ): this {
    return super.once(event, listener as (...args: unknown[]) => void)
  }
  emit<K extends keyof StreamEvents>(
    event: K,
    ...args: Parameters<StreamEvents[K]>
  ): boolean {
    return super.emit(event, ...args)
  }
}
