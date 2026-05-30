const BASE = `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}`

async function post(endpoint: string, body: Record<string, string>) {
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: process.env.ULTRAMSG_TOKEN!, ...body }).toString(),
  })
  return res.json()
}

export async function sendMessage(to: string, body: string) {
  return post('messages/chat', { to, body })
}
