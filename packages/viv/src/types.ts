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

export type ResponseFormat =
  | {
      type: 'text'
    }
  | {
      type: 'json_object'
    }
  | {
      type: 'json_schema'
      json_schema: {
        name: string
        description?: string
        schema: Record<string, unknown>
        strict?: boolean
      }
    }

export type RequestOptions = {
  messages: Message[]
  functions?: Function[]
  function_call?: 'auto' | 'none' | { name: string }
  temperature?: number
  max_tokens?: number
  response_format?: ResponseFormat
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
    accepted_prediction_tokens: number
    rejected_prediction_tokens: number
  }
}

export type RawChunkPrefix = 'f' | 'r' | 'c' | 'g' | 'u' | 'p'

export type ChunkType =
  | 'functionCall'
  | 'functionCallResult'
  | 'content'
  | 'reasoning'
  | 'usage'
  | 'end'

export const chunkPrefixToType: Record<RawChunkPrefix, ChunkType> = {
  f: 'functionCall',
  r: 'functionCallResult',
  c: 'content',
  g: 'reasoning',
  u: 'usage',
  p: 'end',
}

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
  functionCall: (name: string, toolDescription: string) => void
  functionCallResult: (toolName: string, toolResult: string) => void
  reasoning: (delta: string) => void
  content: (delta: string) => void
  chunk: (type: ChunkType, data: unknown) => void
  end: () => void
  error: (error: Error) => void
  abort: () => void
}

export type FunctionCall = {
  id: string
  name: string
  arguments: string
}

export type Choice = {
  index: number
  message: {
    role: 'assistant'
    content: string
    function_calls?: FunctionCall[]
  }
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter'
}

export type CompletionResponse = {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Choice[]
  usage: TokenUsageChunk
}
