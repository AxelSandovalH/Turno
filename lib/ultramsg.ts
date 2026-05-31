const BASE = `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE}`

export async function sendMessage(to: string, body: string) {
  const res = await fetch(`${BASE}/messages/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: process.env.ULTRAMSG_TOKEN, to, body }),
  })
  return res.json()
}
