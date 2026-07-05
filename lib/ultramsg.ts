export interface UltramsgCreds {
  instance?: string | null
  token?: string | null
}

/**
 * Sends a WhatsApp message via UltraMsg.
 * Pass the org's credentials for multi-tenant routing; falls back to the
 * global env vars (founder instance) when the org has none configured.
 */
export async function sendMessage(to: string, body: string, creds?: UltramsgCreds) {
  const instance = creds?.instance || process.env.ULTRAMSG_INSTANCE
  const token = creds?.token || process.env.ULTRAMSG_TOKEN

  if (!instance || !token) {
    console.error('[ultramsg] missing credentials — message not sent to', to)
    return { error: 'missing_credentials' }
  }

  const res = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, to, body }),
  })
  return res.json()
}
