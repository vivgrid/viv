# viv next proxy

```ts
// app/api/vivgrid/route.ts
import { createProxy } from "@yomo/viv-next"

// Create a proxy handler for Next.js API routes
export default createProxy({
  url: "https://api.vivgrid.com/v1/chat/completions",
})

```