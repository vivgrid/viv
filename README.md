# viv

AI Agent Toolkit with fast and meaningful streaming

## Installation

```bash
npm install viv
```

## Usage

```ts
import Viv from 'viv'

const client = new Viv({
  apiKey: 'API_KEY',
})

async function main() {
  const stream = await client.chat.completions.stream({
    message: [{ role: 'user', content: 'Say this is a test' }],
  })
  for wait (const chunk of stream){
    console.log(chunk.type, chunk.data)
  }
}

main()
```

## Chat Completion streaming helpers

This library also provides several conveniences for streaming chat completions, for example:

```ts
import Viv from 'viv'

const client = new Viv({
  apiKey: 'API_KEY',
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

  stream.on('finish', (finish) => {
    console.log('finish: ', finish)
  })

  stream.on('system', (system) => {
    console.log('system: ', system)
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