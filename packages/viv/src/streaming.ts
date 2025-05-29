import { EventEmitter } from 'events'
import type {
  ChunkType,
  FunctionCallChunk,
  FunctionResultChunk,
  StreamChunkData,
  StreamEvents,
  StreamIteratorChunk,
  TokenUsageChunk,
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

    try {
      const [prefix, data] = chunk.split(': ')
      const type = prefix as ChunkType

      if (!this.connected && (type === 'c' || type === 'g')) {
        this.connected = true
        this.emit('connect')
      }

      switch (type) {
        case 'f': {
          const functionCall = JSON.parse(data) as FunctionCallChunk
          this.emit('chunk', type, functionCall)
          this.emit('functionCall', functionCall.name, functionCall.arguments)
          break
        }
        case 'r': {
          const functionResult = JSON.parse(data) as FunctionResultChunk
          this.emit('chunk', type, functionResult)
          this.emit(
            'functionCallResult',
            functionResult.name,
            functionResult.result,
          )
          break
        }
        case 'c': {
          this.emit('chunk', type, data)
          this.emit('content', data)
          break
        }
        case 'g': {
          this.emit('chunk', type, data)
          this.emit('reasoning', data)
          break
        }
        case 'u': {
          const usage = JSON.parse(data) as TokenUsageChunk
          this.emit('chunk', type, usage)
          break
        }
        case 'p': {
          if (data === 'finish') {
            this.emit('chunk', type, data)
            this.emit('end')
          }
          break
        }
        default:
          this.emit('chunk', type, data)
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
