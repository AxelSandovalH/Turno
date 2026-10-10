import { createServiceClient } from '@/lib/supabase/service'
import { configureInstanceWebhook, instanceAction } from '@/lib/ultramsg'

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

/**
 * Desconecta el WhatsApp de un negocio y devuelve su instancia a la reserva para otro.
 * Si no se puede cerrar la sesión no se libera: así la instancia sigue ligada a su
 * negocio (que ya no tiene bot) y nunca queda conectada y sin dueño.
 */
export async function releaseInstanceFromOrg(orgId: string): Promise<boolean> {
  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('ultramsg_instance, ultramsg_token').eq('id', orgId).single()
  if (!org?.ultramsg_instance || !org?.ultramsg_token) return true // nada que liberar

  const creds = { instance: org.ultramsg_instance as string, token: org.ultramsg_token as string }
  try {
    await instanceAction(creds, 'logout')
  } catch (err) {
    console.error('[whatsapp] no se pudo cerrar la sesión; la instancia se queda asignada:', err)
    return false
  }

  // De vuelta a la reserva (si no estaba, entra: así también se reciclan las asignadas a mano)
  await db.from('whatsapp_instances').upsert(
    { instance_id: creds.instance, token: creds.token, organization_id: null, assigned_at: null },
    { onConflict: 'instance_id' }
  )
  await db.from('organizations').update({ ultramsg_instance: null, ultramsg_token: null, whatsapp_connected_at: null }).eq('id', orgId)
  return true
}
