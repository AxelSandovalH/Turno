import { createServiceClient } from '@/lib/supabase/service'
import { wasSentBySystem } from '@/lib/outbound-log'

const RESUME = /^[/#]bot\b/i

/**
 * Mensaje que SALIÓ de la línea del negocio (UltraMsg "Webhook on Create"). Si no lo envió el sistema, lo escribió una
 * persona a mano: el bot se calla en ese chat unas horas. Si la persona escribe "/bot", el bot retoma de inmediato.
 */
export async function handleManualMessage(body: { instanceId?: string; instance_id?: string }, msg: { type?: string; to?: string; body?: string; caption?: string }) {
  const instanceId = String(body?.instanceId ?? body?.instance_id ?? '')
  const to = String(msg?.to ?? '')
  if (!instanceId || !to || to.endsWith('@g.us') || to.includes('status@broadcast')) return
  const phone = to.replace('@c.us', '').replace(/\D/g, '')
  if (!phone) return

  const db = createServiceClient()
  const candidates = instanceId.startsWith('instance') ? [instanceId, instanceId.replace(/^instance/, '')] : [instanceId, `instance${instanceId}`]
  const { data: org } = await db.from('organizations').select('id, bot_pause_hours').in('ultramsg_instance', candidates).maybeSingle()
  if (!org) return // no es la línea de un negocio (p. ej. la de ventas)

  const text = typeof msg.body === 'string' ? msg.body.trim() : ''

  // "/bot": la persona le devuelve el chat al bot
  if (msg.type === 'chat' && RESUME.test(text)) {
    await db.from('conversations').update({ bot_paused_until: null }).eq('organization_id', org.id).eq('whatsapp_phone', phone)
    return
  }

  // ¿Lo envió el propio sistema (bot, avisos, links de pago)? Entonces no es una persona
  const sig = msg.type === 'chat' ? text : msg.type === 'image' ? `[image] ${msg.caption ?? ''}` : null
  if (sig !== null && await wasSentBySystem(instanceId, to, sig)) return

  const hours = Math.max(1, Number(org.bot_pause_hours) || 6)
  const until = new Date(Date.now() + hours * 3600_000).toISOString()
  const { error } = await db.from('conversations').upsert(
    { organization_id: org.id, whatsapp_phone: phone, status: 'active', bot_paused_until: until },
    { onConflict: 'organization_id,whatsapp_phone' }
  )
  if (error) console.error('[manual-takeover] no se pudo pausar', error.message)
  else console.log('[manual-takeover] bot en pausa', hours, 'h para', phone)

  // Limpieza: el registro de envíos solo sirve unos minutos
  if (Math.random() < 0.05) await db.from('outbound_log').delete().lt('created_at', new Date(Date.now() - 2 * 24 * 3600_000).toISOString())
}
