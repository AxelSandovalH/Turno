import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { wasSentBySystem } from '@/lib/outbound-log'
import { waId } from '@/lib/payment-links'
import { getSalesConfig, isSalesInstance, salesCreds } from '@/lib/sales/config'
import { isOwnerPhone } from '@/lib/sales/owner'
import { phoneKey } from '@/lib/sales/phone'

const RESUME = /^[/#]bot\b/i
export const MANUAL_HANDOFF_REASON = 'Escribiste a mano: el agente se calló en este chat (escribe /bot en el chat para reactivarlo)'

interface Out { type?: string; to?: string; body?: string; caption?: string }

/**
 * Salió un mensaje de la línea de ventas escrito por una persona (no por el sistema): el agente se calla con ese
 * prospecto. Queda como 'handoff', que el agente ya respeta. Si la persona escribe "/bot" en el chat, el agente retoma.
 * Devuelve true si el mensaje era de la línea de ventas (ya no debe tratarse como la línea de un negocio).
 */
export async function handleSalesManualMessage(instanceId: string, msg: Out): Promise<boolean> {
  const cfg = await getSalesConfig()
  if (!cfg || !isSalesInstance(instanceId, cfg)) return false
  await pauseSalesProspect(instanceId, msg)
  return true
}

/** Núcleo: pausa (o reanuda con /bot) al prospecto al que se le escribió a mano. No hace nada si no es un prospecto. */
export async function pauseSalesProspect(instanceId: string, msg: Out) {
  const cfg = await getSalesConfig()
  if (!cfg) return
  const to = String(msg.to ?? '')
  if (!to || to.endsWith('@g.us') || to.includes('status@broadcast')) return
  const phone = to.replace('@c.us', '').replace(/\D/g, '')
  if (!phone || isOwnerPhone(phone, cfg)) return // lo que sale hacia ti (avisos, consultas) no cuenta

  const text = typeof msg.body === 'string' ? msg.body.trim() : ''
  const db = createServiceClient()
  const { data: prospect } = await db.from('prospects').select('id, status').eq('phone_key', phoneKey(phone)).maybeSingle()
  if (!prospect || prospect.status === 'opted_out' || prospect.status === 'won') return

  const notify = (t: string) => {
    const creds = salesCreds(cfg)
    if (!cfg.owner_phone || !creds) return Promise.resolve()
    return sendMessage(`${waId(cfg.owner_phone)}@c.us`, t, creds).catch(() => {})
  }

  // "/bot": el agente retoma
  if (msg.type === 'chat' && RESUME.test(text)) {
    if (prospect.status === 'handoff') {
      await db.from('prospects').update({ status: 'replied', handoff_reason: null }).eq('id', prospect.id)
      await notify(`▶️ El agente de ventas retoma el chat con +${phone}.`)
    }
    return
  }

  // ¿Lo envió el propio sistema (agente, seguimientos, avisos)? Entonces no es una persona
  const sig = msg.type === 'chat' ? text : msg.type === 'image' ? `[image] ${msg.caption ?? ''}` : null
  if (sig !== null && await wasSentBySystem(instanceId, to, sig)) return

  // Lo que escribiste queda en el historial para que el agente tenga el contexto si retoma
  if (msg.type === 'chat' && text) await db.from('prospect_messages').insert({ prospect_id: prospect.id, role: 'assistant', kind: 'chat', content: text })

  if (prospect.status === 'handoff') return // ya estaba callado
  await db.from('prospects').update({ status: 'handoff', handoff_reason: MANUAL_HANDOFF_REASON }).eq('id', prospect.id)
  console.log('[sales-takeover] agente callado con', phone)
  await notify(`⏸ Escribiste a mano con +${phone}: el agente de ventas se calló en ese chat. Escribe /bot ahí para reactivarlo.`)
}
