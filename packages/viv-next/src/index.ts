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

import { NextRequest, NextResponse } from 'next/server'

interface VivError extends Error {
  status?: number
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  }
}

export async function handleRequest(
  req: NextRequest,
  {
    baseURL = 'https://api.vivgrid.com/v1',
    method = 'POST',
  }: { baseURL: string; method?: string },
) {
  try {
    const path = req.nextUrl.pathname.replace(/^\/?api\//, '')

    const url = new URL(req.url)
    const searchParams = new URLSearchParams(url.search)
    searchParams.delete('_path')
    searchParams.delete('nxtP_path')
    const queryString = searchParams.toString()
      ? `?${searchParams.toString()}`
      : ''

    const forwardHeaders = Object.fromEntries(
      ['authorization', 'x-response-format']
        .map((key) => [key, req.headers.get(key)])
        .filter(([, value]) => value !== null),
    )

    const options: RequestInit = {
      method,
      headers: forwardHeaders,
    }
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = await req.text()
    }
    const res = await fetch(`${baseURL}/${path}${queryString}`, options)
    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        ...res.headers,
        ...getCorsHeaders(),
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
  } catch (error) {
    const err = error as VivError
    return NextResponse.json(
      { error: err.message },
      { status: err.status ?? 500 },
    )
  }
}

export function handleOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(),
    },
  })
}
