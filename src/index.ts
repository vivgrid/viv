import * as Core from './core'
import * as Errors from './error'
import { ChatResource } from './resources/chat'

export interface ClientOptions {
  apiKey: string
  baseURL?: string
  timeout?: number
  maxRetries?: number
  defaultHeaders?: Core.Headers
  defaultQuery?: Core.DefaultQuery
}
class Viv {
  apiKey: string
  baseURL: string
  timeout: number
  maxRetries: number
  defaultHeaders: Core.Headers
  defaultQuery: Core.DefaultQuery

  readonly chat: ChatResource
  constructor(options: ClientOptions) {
    if (!options.apiKey) {
      throw new Errors.VivError('apiKey is required')
    }
    this.apiKey = options.apiKey
    this.baseURL = options.baseURL || 'https://api.vivgrid.com/v1'
    this.timeout = options.timeout || 1000 * 60 * 10
    this.maxRetries = options.maxRetries || 2
    this.defaultHeaders = {
      ...options.defaultHeaders,
      'X-Response-Format': 'vivgrid',
    }
    this.defaultQuery = options.defaultQuery || {}

    this.chat = new ChatResource(this)
  }
}
export default Viv
