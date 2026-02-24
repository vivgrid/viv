import { handleOptions, handleRequest } from '@yomo/viv-next'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export const POST = (req: NextRequest) => handleRequest(req, {
  baseURL: 'https://api.vivgrid.com/v1',
  method: 'POST',
})
export const OPTIONS = () => handleOptions()
