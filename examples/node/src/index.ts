import 'dotenv/config'
import Viv from '@yomo/viv'

async function main() {
  const client = new Viv({
    apiKey: process.env.VIV_API_KEY!,
  })

  const stream = await client.chat.completions.stream({
    messages: [{ role: 'user', content: 'Say this is a test' }],
  })

  for await (const chunk of stream) {
    console.log(chunk)
  }
}

main()
