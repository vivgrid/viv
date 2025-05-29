import { createProxy } from "@yomo/viv-next"

export const POST = createProxy({
  url: 'https://api.vivgrid.com/v1/chat/completions',
})