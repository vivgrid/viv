export type Message = {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string
  function_call?: {
    name: string
    arguments: string
  }
}

export type Function = {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type RequestOptions = {
  messages: Message[]
  functions?: Function[]
  function_call?: 'auto' | 'none' | { name: string }
  temperature?: number
  max_tokens?: number
}

export type ClientOptions = {
  apiKey: string
  baseURL?: string
  maxRetries?: number
  retryDelay?: number
}

export type FunctionCallChunk = {
  tool_call_id: string
  name: string
  arguments: string
  status?: 'started' | 'completed'
}

export type FunctionResultChunk = {
  tool_call_id: string
  name: string
  result: string
  status?: 'started' | 'completed'
}

export type TokenUsageChunk = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  prompt_tokens_details: {
    audio_tokens: number
    cached_tokens: number
  }
  completion_tokens_details: {
    audio_tokens: number
    reasoning_tokens: number
  }
}

export type ChunkType = 'f' | 'r' | 'c' | 'g' | 'u' | 'p'

export type StreamChunkData =
  | string
  | FunctionCallChunk
  | FunctionResultChunk
  | TokenUsageChunk
export type StreamChunk = {
  type: ChunkType
  data: StreamChunkData
}

export type StreamIteratorChunk = {
  type: ChunkType
  data: StreamChunkData
  raw?: string
}

export type StreamEvents = {
  connect: () => void
  functionCall: (toolName: string, toolDescription: string) => void
  functionCallResult: (toolName: string, toolResult: string) => void
  reasoning: (delta: string) => void
  content: (delta: string) => void
  chunk: (type: ChunkType, data: unknown) => void
  end: () => void
  error: (error: Error) => void
  abort: () => void
}
