import { createServiceClient } from '@/lib/supabase/service'
import { decryptSecret } from '@/lib/secrets'

const API = 'https://api.payclip.com'

export interface OrgClip { token: string; livemode: boolean }

/** Clip propio del negocio (Basic base64(api_key:api_secret)), o null si no lo configuró. */
export async function getOrgClip(orgId: string): Promise<OrgClip | null> {
  const { data } = await createServiceClient().from('org_clip_accounts').select('api_key_enc, api_secret_enc, livemode').eq('organization_id', orgId).maybeSingle()
  if (!data) return null
  const token = Buffer.from(`${decryptSecret(data.api_key_enc)}:${decryptSecret(data.api_secret_enc)}`).toString('base64')
  return { token, livemode: !!data.livemode }
}

const headers = (token: string) => ({ Authorization: `Basic ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' })

/** Crea un link de pago (Checkout Redireccionado). Devuelve la URL a la que se manda al cliente y el id para reconocer el webhook. */
export async function createClipCheckout(token: string, body: {
  amount: number; currency: string; description: string; webhookUrl: string; successUrl: string; errorUrl: string; defaultUrl: string
}): Promise<{ id: string; url: string }> {
  const res = await fetch(`${API}/v2/checkout`, {
    method: 'POST', headers: headers(token), signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      amount: body.amount,
      currency: body.currency.toUpperCase(),
      purchase_description: body.description.slice(0, 250),
      webhook_url: body.webhookUrl,
      redirection_url: { success: body.successUrl, error: body.errorUrl, default: body.defaultUrl },
    }),
  })
  const d = await res.json().catch(() => ({})) as { payment_request_id?: string; payment_request_url?: string }
  if (!res.ok || !d.payment_request_id || !d.payment_request_url) throw new Error(`Clip ${res.status}: ${JSON.stringify(d).slice(0, 300)}`)
  return { id: d.payment_request_id, url: d.payment_request_url }
}

/** Estado actual de un link de pago, consultado a Clip (el webhook no trae firma: esto es lo que lo hace confiable). */
export async function getClipCheckoutStatus(token: string, id: string): Promise<string | null> {
  const res = await fetch(`${API}/v2/checkout/${encodeURIComponent(id)}`, { headers: headers(token), signal: AbortSignal.timeout(15_000) })
  if (!res.ok) return null
  const d = await res.json().catch(() => null) as { status?: string } | null
  return d?.status ?? null
}

/** ¿Clip acepta estas credenciales? 401/403 = no; cualquier otra respuesta (p. ej. 404 de un id inexistente) = sí. */
export async function clipCredentialsWork(token: string): Promise<boolean> {
  const res = await fetch(`${API}/v2/checkout/00000000-0000-4000-8000-000000000000`, { headers: headers(token), signal: AbortSignal.timeout(15_000) })
  return res.status !== 401 && res.status !== 403
}
