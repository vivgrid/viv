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
import { VivError } from './error'

export type ChunkType =
  | 'function_call'
  | 'function_call_result'
  | 'content'
  | 'reasoning'
  | 'usage'
  | 'finish'
  | 'system'
  | 'error'

export interface FunctionCallChunk {
  status: string
  tool_call_id: string
  name: string
  arguments: string
}

export interface FunctionResultChunk {
  status: string
  tool_call_id: string
  name: string
  result: string
  ai_note?: string
}

export interface UsageChunk {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  prompt_tokens_details?: {
    audio_tokens: number
    cached_tokens: number
  }
  completion_tokens_details?: {
    audio_tokens: number
    reasoning_tokens: number
  }
}

export interface ErrorChunk {
  code: string
  message: string
}

export interface Chunk {
  type: ChunkType
  data:
    | string
    | FunctionCallChunk
    | FunctionResultChunk
    | UsageChunk
    | ErrorChunk
}

interface VivStreamEvents {
  connect: () => void
  chunk: (type: ChunkType, data: Chunk['data']) => void
  functionCall: (name: string, args: string, tool_call_id: string) => void
  functionCallResult: (
    name: string,
    result: string,
    tool_call_id: string,
    ai_note?: string,
  ) => void
  content: (content: string) => void
  reasoning: (reasoning: string) => void
  usage: (usage: UsageChunk) => void
  finish: (finish: string) => void
  system: (system: string) => void
  error: (error: Error) => void
  end: () => void
  abort: () => void
}

export class VivStream extends EventEmitter {
  private stream: ReadableStream
  private reader: ReadableStreamDefaultReader | null = null
  private abortController: AbortController
  private isReading = false
  private buffer = ''

  constructor(stream: ReadableStream) {
    super()
    this.stream = stream
    this.abortController = new AbortController()
    this.read()
  }
  private async read() {
    if (this.isReading) return
    this.isReading = true

    try {
      this.reader = this.stream.getReader()

      const { value, done } = await this.reader.read()
      if (!done && value) {
        this.emit('connect')
      }
      await this.processStream()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.handleError(error)
    }
  }
  private async processStream() {
    if (!this.reader) return

    try {
      while (true) {
        const { value, done } = await this.reader.read()
        if (done) {
          this.emit('end')
          break
        }
        if (value) {
          const chunks = this.decodeChunks(value)
          for (const chunk of chunks) {
            this.handleChunk(chunk)
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.emit('abort')
      } else {
        this.handleError(error)
      }
    } finally {
      this.isReading = false
      this.reader = null
    }
  }
  private decodeChunks(value: Uint8Array): Chunk[] {
    const decoder = new TextDecoder()
    const text = decoder.decode(value, { stream: true })

    this.buffer += text

    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    // 检查缓冲区R-Format的消息
    if (this.buffer.match(/^[frcgupse]:/)) {
      lines.push(this.buffer)
      this.buffer = ''
    }

    const chunks: Chunk[] = []
    for (const line of lines) {
      if (!line.trim()) continue
      const match = line.match(/^([frcgupse]):(.+)$/)
      if (!match) continue
      const [, matchType, matchData] = match
      let type: ChunkType | undefined
      let data: Chunk['data']
      switch (matchType) {
        case 'f':
          type = 'function_call'
          try {
            data = JSON.parse(matchData) as FunctionCallChunk
            chunks.push({ type, data })
          } catch (error) {
            console.error('Error parsing function_call chunk:', error)
          }
          break
        case 'r':
          type = 'function_call_result'
          try {
            data = JSON.parse(matchData) as FunctionResultChunk
            chunks.push({ type, data })
          } catch (error) {
            console.error('Error parsing function_call_result chunk:', error)
          }
          break
        case 'c':
          type = 'content'
          try {
            data = JSON.parse(matchData) as string
            chunks.push({ type, data })
          } catch (error) {
            console.error('Error parsing content chunk:', error)
          }
          break
        case 'g':
          type = 'reasoning'
          try {
            data = JSON.parse(matchData) as string
            chunks.push({ type, data })
          } catch (error) {
            console.error('Error parsing reasoning chunk:', error)
          }
          break
        case 'u':
          type = 'usage'
          try {
            data = JSON.parse(matchData) as UsageChunk
            chunks.push({ type, data })
          } catch (error) {
            console.error('Error parsing usage chunk:', error)
          }
          break
        case 'p':
          type = 'finish'
          data = (matchData || '').trim()
          chunks.push({ type, data })

          break
        case 's':
          type = 'system'
          try {
            data = JSON.parse(matchData) as string
            chunks.push({ type, data })
          } catch (error) {
            console.error('Error parsing system chunk:', error)
          }
          break
        case 'e':
          type = 'error'
          try {
            data = JSON.parse(matchData) as ErrorChunk
            chunks.push({ type, data })
          } catch (error) {
            console.error('Error parsing error chunk:', error)
          }
          break
      }
    }
    return chunks
  }
  private handleChunk(chunk: Chunk) {
    this.emit('chunk', chunk.type, chunk.data)

    switch (chunk.type) {
      case 'function_call': {
        const data = chunk.data as FunctionCallChunk
        this.emit('functionCall', data.name, data.arguments, data.tool_call_id)
        break
      }
      case 'function_call_result': {
        const data = chunk.data as FunctionResultChunk
        this.emit(
          'functionCallResult',
          data.name,
          data.result,
          data.tool_call_id,
          data.ai_note,
        )
        break
      }
      case 'content': {
        const content = chunk.data as string
        this.emit('content', content)
        break
      }
      case 'reasoning': {
        const reasoning = chunk.data as string
        this.emit('reasoning', reasoning)
        break
      }
      case 'usage': {
        const usage = chunk.data as UsageChunk
        this.emit('usage', usage)
        break
      }
      case 'finish': {
        const finish = chunk.data as string
        this.emit('finish', finish)
        break
      }
      case 'system': {
        const system = chunk.data as string
        this.emit('system', system)
        break
      }
    }
  }
  private handleError(error: Error) {
    const err = new VivError(error.message)
    this.emit('error', err)
  }

  abort() {
    this.abortController.abort()
    if (this.reader) {
      this.reader.cancel()
    }
    this.emit('abort')
  }

  on<Event extends keyof VivStreamEvents>(
    event: Event,
    listener: VivStreamEvents[Event],
  ): this {
    return super.on(event, listener)
  }

  once<Event extends keyof VivStreamEvents>(
    event: Event,
    listener: VivStreamEvents[Event],
  ): this {
    return super.once(event, listener)
  }

  // ts config target > es2018
  [Symbol.asyncIterator](): AsyncIterator<Chunk> {
    const chunks: Chunk[] = []
    let done = false
    let error: Error | null = null
    let resolvePromise: ((value: IteratorResult<Chunk>) => void) | null = null
    let rejectPromise: ((err: Error) => void) | null = null

    this.on('chunk', (type, data) => {
      chunks.push({ type, data })
      if (resolvePromise) {
        const chunk = chunks.shift()!
        resolvePromise({ value: chunk, done: false })
        resolvePromise = null
      }
    })

    this.on('end', () => {
      done = true
      if (resolvePromise) {
        resolvePromise({ value: undefined, done: true })
        resolvePromise = null
      }
    })

    this.on('error', (err) => {
      error = err
      if (rejectPromise) {
        rejectPromise(error)
        rejectPromise = null
      }
    })

    return {
      next: (): Promise<IteratorResult<Chunk>> => {
        if (error) {
          return Promise.reject(error)
        }

        if (done && chunks.length === 0) {
          return Promise.resolve({ value: undefined, done: true })
        }

        if (chunks.length > 0) {
          const chunk = chunks.shift()!
          return Promise.resolve({ value: chunk, done: false })
        }

        return new Promise<IteratorResult<Chunk>>((resolve, reject) => {
          resolvePromise = resolve
          rejectPromise = reject
        })
      },
    }
  }
}
