'use client'
import Viv from '@yomo/viv'
import { useEffect, useRef, useState } from 'react'

export function Example() {
  const [text, setText] = useState('')
  const [streamText, setStreamText] = useState('')


  const clientRef = useRef<Viv | null>(null)

  useEffect(() => {
    if (clientRef.current) return
    clientRef.current = new Viv({
      apiKey: process.env.NEXT_PUBLIC_VIV_API_KEY!,
      baseURL: '/api'
    })
  })


  const handleRequest = async () => {
    if (!clientRef.current) return
    setText('')
    const response = await clientRef.current.chat.completions.create({
      messages: [{ role: 'user', content: 'Say this is a test' }],
    })
    setText(response.choices[0].message.content)
  }

  const handleStreamRequest = async () => {
    if (!clientRef.current) return
    setStreamText('')
    const stream = await clientRef.current.chat.completions.stream({
      messages: [{ role: 'user', content: 'Say this is a test' }],
    })
    for await (const chunk of stream) {
      if (chunk.type === 'content') {
        setStreamText(pre => pre + chunk.data)
      }
    }
  }

  return (
    <div className='h-screen flex items-center justify-center gap-2'>
      <div className="grid grid-cols-2 gap-2 w-5xl">
        <div className="flex flex-col gap-2 w-full">
          <div className="border overflow-auto h-64 whitespace-pre-line">{text}</div>
          <button className="rounded-md text-sm font-medium outline-none bg-black text-white shadow-xs hover:bg-black/90 h-9 px-4 py-2" onClick={handleRequest}>chat.completions.create</button>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <div className="border overflow-auto h-64 whitespace-pre-line">{streamText}</div>
          <button className="rounded-md text-sm font-medium outline-none bg-black text-white shadow-xs hover:bg-black/90 h-9 px-4 py-2" onClick={handleStreamRequest}>chat.completions.stream</button>
        </div>
      </div>
    </div>
  )
}