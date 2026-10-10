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

/**
 * Envía una imagen por WhatsApp (UltraMsg). `image` es la URL pública de la foto;
 * `caption` es el texto que va debajo.
 */
export async function sendImage(to: string, image: string, caption: string, creds?: UltramsgCreds) {
  const instance = creds?.instance || process.env.ULTRAMSG_INSTANCE
  const token = creds?.token || process.env.ULTRAMSG_TOKEN

  if (!instance || !token) {
    console.error('[ultramsg] missing credentials — image not sent to', to)
    return { error: 'missing_credentials' }
  }

  const res = await fetch(`https://api.ultramsg.com/${instance}/messages/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, to, image, caption }),
  })
  return res.json()
}

// ── Administración de la instancia: estado, código QR y webhook ───────────────

export type InstanceState = 'connected' | 'qr' | 'loading' | 'disconnected' | 'unknown'

/** Interpreta la respuesta de /instance/status sin depender de su forma exacta. */
export function parseInstanceStatus(json: unknown): { raw: string | null; state: InstanceState } {
  const j = json as { status?: unknown; accountStatus?: { status?: string } } | null
  const nested = (j?.status as { accountStatus?: { status?: string } } | undefined)?.accountStatus?.status
  const raw = nested ?? j?.accountStatus?.status ?? (typeof j?.status === 'string' ? j.status : null)
  if (!raw) return { raw: null, state: 'unknown' }
  switch (raw) {
    case 'authenticated': return { raw, state: 'connected' }
    case 'qr': return { raw, state: 'qr' }
    case 'initialize': case 'loading': case 'retrying': return { raw, state: 'loading' }
    case 'disconnected': case 'standby': return { raw, state: 'disconnected' }
    default: return { raw, state: 'unknown' }
  }
}

/** Convierte la respuesta del QR (imagen, JSON con base64 o base64 suelto) en una imagen lista para mostrar. */
export function qrToDataUrl(contentType: string, body: Uint8Array): string | null {
  if (contentType.startsWith('image/')) {
    return `data:${contentType.split(';')[0]};base64,${Buffer.from(body).toString('base64')}`
  }
  const text = Buffer.from(body).toString('utf8').trim()
  const asDataUrl = (v: string): string | null => {
    if (v.startsWith('data:image')) return v
    if (v.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(v)) return `data:image/png;base64,${v.replace(/\s/g, '')}`
    return null
  }
  try {
    const found: string[] = []
    const walk = (x: unknown) => {
      if (typeof x === 'string') found.push(x)
      else if (x && typeof x === 'object') Object.values(x as Record<string, unknown>).forEach(walk)
    }
    walk(JSON.parse(text))
    for (const v of found) { const r = asDataUrl(v); if (r) return r }
    return null
  } catch {
    return asDataUrl(text)
  }
}

const apiBase = (instance: string) => `https://api.ultramsg.com/${instance}`

export async function getInstanceStatus(creds: { instance: string; token: string }) {
  const res = await fetch(`${apiBase(creds.instance)}/instance/status?token=${encodeURIComponent(creds.token)}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ultramsg status ${res.status}`)
  return parseInstanceStatus(await res.json().catch(() => null))
}

/** QR vigente de la instancia como data URL (null si no hay uno disponible). */
export async function getInstanceQr(creds: { instance: string; token: string }): Promise<string | null> {
  for (const path of ['qr', 'qrCode']) {
    const res = await fetch(`${apiBase(creds.instance)}/instance/${path}?token=${encodeURIComponent(creds.token)}`, { cache: 'no-store' })
    if (!res.ok) continue
    const qr = qrToDataUrl(res.headers.get('content-type') ?? '', new Uint8Array(await res.arrayBuffer()))
    if (qr) return qr
  }
  return null
}

/** Apunta la instancia al webhook de QuickTurno: solo mensajes recibidos. */
export async function configureInstanceWebhook(creds: { instance: string; token: string }, webhookUrl: string) {
  const res = await fetch(`${apiBase(creds.instance)}/instance/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: creds.token,
      sendDelay: 1,
      sendDelayMax: 15,
      webhook_url: webhookUrl,
      webhook_message_received: true,
      webhook_message_create: false,
      webhook_message_ack: false,
      webhook_message_download_media: false,
    }),
  })
  if (!res.ok) throw new Error(`ultramsg settings ${res.status}`)
}

export async function instanceAction(creds: { instance: string; token: string }, action: 'logout' | 'restart') {
  const res = await fetch(`${apiBase(creds.instance)}/instance/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: creds.token }),
  })
  if (!res.ok) throw new Error(`ultramsg ${action} ${res.status}`)
}
