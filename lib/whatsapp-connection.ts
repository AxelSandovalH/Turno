import { createServiceClient } from '@/lib/supabase/service'
import { configureInstanceWebhook } from '@/lib/ultramsg'

export const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'}/api/whatsapp`

/** UltraMsg pide el id como "instance123456": acepta también solo los dígitos. */
export function normalizeInstanceId(raw: string): string {
  const v = raw.trim()
  return /^\d+$/.test(v) ? `instance${v}` : v
}

/**
 * Le asigna a un negocio una instancia libre de la reserva y deja su webhook
 * configurado. Devuelve null si no hay instancias libres.
 */
export async function claimInstanceForOrg(orgId: string): Promise<{ instance: string; token: string } | null> {
  const db = createServiceClient()
  const { data, error } = await db.rpc('claim_whatsapp_instance', { p_org: orgId })
  if (error) { console.error('[whatsapp] claim failed:', error.message); return null }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.instance_id) return null

  const creds = { instance: row.instance_id as string, token: row.token as string }
  const { error: updError } = await db
    .from('organizations')
    .update({ ultramsg_instance: creds.instance, ultramsg_token: creds.token })
    .eq('id', orgId)
  if (updError) {
    console.error('[whatsapp] assign failed:', updError.message)
    // No dejar la instancia "asignada" a un negocio que no la recibió
    await db.from('whatsapp_instances').update({ organization_id: null, assigned_at: null }).eq('instance_id', creds.instance)
    return null
  }

  await configureInstanceWebhook(creds, WEBHOOK_URL).catch(err => console.error('[whatsapp] webhook config failed:', err))
  return creds
}
