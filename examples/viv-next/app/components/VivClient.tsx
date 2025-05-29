'use client'
import Viv from '@yomo/viv'
import { useRef } from 'react'

export function VivClient() {
  const client = useRef(new Viv({
    apiKey: process.env.NEXT_PUBLIC_API_KEY!,
    baseURL: '/api'
  }))

  const triggerCompletion = async () => {
    const stream = await client.current.chat.completions.stream({
      messages: [{ role: 'user', content: 'Say this is a test' }],
    })
    for await (const chunk of stream){
      console.log(chunk.type, chunk.data)
    }
  }

  return (
    <button onClick={triggerCompletion}>test</button>
  )
}