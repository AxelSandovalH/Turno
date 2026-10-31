import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage, type UltramsgCreds } from '@/lib/ultramsg'
import { TRIAL_DAYS, TRIAL_MESSAGES } from '@/lib/plans'
import { waId } from '@/lib/payment-links'

/**
 * Prueba gratis con Asistente: dentro de los 7 días el bot contesta hasta TRIAL_MESSAGES mensajes. Pasado el tope calla (no le
 * escribe al cliente final) y se le avisa UNA vez al dueño para que active su plan. Fuera de la prueba no hay límite.
 */
export async function trialBlocksBot(org: { id: string; name: string; whatsapp_number: string | null }, creds: UltramsgCreds): Promise<boolean> {
  const db = createServiceClient()
  const { data } = await db.from('organizations').select('trial_ends_at, paid_until').eq('id', org.id).maybeSingle()
  const ends = data?.trial_ends_at ? new Date(data.trial_ends_at).getTime() : 0
  if (!ends || ends <= Date.now() || data?.paid_until) return false // sin prueba activa: sin límite

  const since = new Date(ends - TRIAL_DAYS * 86_400_000).toISOString()
  const { count } = await db.from('messages').select('id', { count: 'exact', head: true })
    .eq('organization_id', org.id).eq('role', 'assistant').gte('created_at', since)
  if ((count ?? 0) < TRIAL_MESSAGES) return false

  // Aviso único al dueño (tolera que la migración 055 aún no esté corrida)
  const { data: n, error } = await db.from('organizations').select('trial_limit_notified_at').eq('id', org.id).maybeSingle()
  if (!error && !n?.trial_limit_notified_at && org.whatsapp_number) {
    await db.from('organizations').update({ trial_limit_notified_at: new Date().toISOString() }).eq('id', org.id)
    await sendMessage(`${waId(org.whatsapp_number)}@c.us`, `Tu prueba gratis del Asistente de WhatsApp llegó a ${TRIAL_MESSAGES} mensajes, así que ${org.name} dejó de contestar solo. Activa tu plan para que siga atendiendo: https://www.quickturno.app/payment`, creds).catch(() => {})
  }
  return true
}
