import { APIClient } from '../../core'
import Viv from '../..'
import { VivStream } from '../../streaming'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
  function_call?: {
    name: string
    description: string
    result: Record<string, unknown>
  }
}

export interface ChatCompletionsOptions {
  messages: Message[]
}

export class ChatCompletionsResource {
  private client: Viv

  constructor(client: Viv) {
    this.client = client
  }

  async stream(options: ChatCompletionsOptions): Promise<VivStream> {
    const apiClient = new APIClient({
      apiKey: this.client.apiKey,
      baseURL: this.client.baseURL,
      timeout: this.client.timeout,
      maxRetries: this.client.maxRetries,
      defaultHeaders: this.client.defaultHeaders,
      defaultQuery: this.client.defaultQuery,
    })

    const stream = await apiClient.stream({
      method: 'POST',
      path: '/v1/chat/completions',
      body: {
        ...options,
        stream: true,
      },
    })

    return new VivStream(stream)
  }
}
