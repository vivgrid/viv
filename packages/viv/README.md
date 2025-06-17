# viv

AI Agent Toolkit with fast and meaningful streaming response

## Installation

```bash
npm install @yomo/viv
```

## Usage

```ts
import Viv from '@yomo/viv'

const client = new Viv({
  apiKey: 'API_KEY',
})

async function main() {
  const stream = await client.chat.completions.stream({
    message: [{ role: 'user', content: 'Say this is a test' }],
  })
  for await (const chunk of stream){
    console.log(chunk.type, chunk.data)
  }
}

main()
```

## Chat Completion streaming helpers

This library also provides several conveniences for streaming chat completions, for example:

```ts
import Viv from '@yomo/viv'

const client = new Viv({
  apiKey: process.env.API_KEY,
})

async function main() {
  const stream = await client.chat.completions.stream({
    message: [{ role: 'user', content: 'Say this is a test' }],
  })
  stream.on('connect', () => {
    console.log('connected')
  })

  stream.on('reasoning', (reasoning) => {
    console.log('reasoning: ', reasoning)
  })

  stream.on('content', (content) => {
    console.log('content: ', content)
  })

  stream.on('usage', (usage) => {
    console.log('usage: ', usage)
  })

  stream.on('functionCall', (name, args) => {
    console.log('function_call: ', name, args)
  })

  stream.on('functionCallResult', (name, result) => {
    console.log('function_call_result: ', name, result)
  })

  stream.on('end', () => {
    console.log('end')
  })

  stream.on('error', (error) => {
    console.error('error:', error)
  })

  stream.on('abort', () => {
    console.log('abort')
  })
}

main()
```

## Retries

Certain errors will be automatically retried 2 times by default, >=500 Internal errors will all be retried by default

```ts
const client = new Viv({
  maxRetries: 0, // default is 2
})
```

## Timeouts
Requests time out after 10 minutes by default. You can configure this with a timeout option:

```ts
const client = new Viv({
  timeout: 20 * 1000, // 20 seconds (default is 10 minutes)
})
```