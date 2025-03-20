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

import Viv from '../..'
import { APIClient } from '../../core'
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
      url: this.client.url,
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
