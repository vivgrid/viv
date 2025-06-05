## Example

```ts
// app/api/chat/completions.ts
import { handleOptions, handleRequest } from '@yomo/viv-next'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export const POST = (req: NextRequest) => handleRequest(req, {
  baseURL: 'https://api.vivgrid.com/v1',
  method: 'POST',
})
export const OPTIONS = () => handleOptions()
```

```ts
// client
new Viv({
  apiKey: process.env.NEXT_PUBLIC_VIV_API_KEY!,
  baseURL: '/api'
})
```