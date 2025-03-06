import Viv from '../..'
import { ChatCompletionsResource } from './completions'

export class ChatResource {
  readonly completions: ChatCompletionsResource

  constructor(client: Viv) {
    this.completions = new ChatCompletionsResource(client)
  }
}
