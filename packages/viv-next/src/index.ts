import { type NextRequest, NextResponse } from 'next/server'

export function createProxy(options: { url: string }) {
  return async function handler(req: NextRequest): Promise<NextResponse> {
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }

    try {
      const requestBody = await req.json()

      const response = await fetch(
        options.url || 'https://api.vivgrid.com/v1/chat/completions',
        {
          method: 'POST',
          headers: req.headers,
          body: JSON.stringify(requestBody),
        },
      )

      const newResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })

      return newResponse
    } catch (error) {
      console.error('Proxy error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 },
      )
    }
  }
}
