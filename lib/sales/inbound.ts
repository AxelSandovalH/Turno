import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { getSalesConfig, isSalesInstance, salesCreds } from '@/lib/sales/config'
import { isOptOut, isAutoReply, phoneKey } from '@/lib/sales/phone'
import { runSalesAgent } from '@/lib/sales/agent'

/**
 * Mensaje entrante en la línea de ventas. Si quien escribe es un prospecto cargado, lo atiende el
 * agente de ventas y se devuelve true (el webhook ya no debe tratarlo como cliente de un negocio).
 * Si no es un prospecto, devuelve false y el flujo normal sigue igual.
 */
export async function handleSalesInbound(args: { instanceId: string; phone: string; text: string; msgId: string }): Promise<boolean> {
  const cfg = await getSalesConfig()
  if (!cfg?.enabled || !isSalesInstance(args.instanceId, cfg)) return false
  const creds = salesCreds(cfg)
  if (!creds) return false

  const db = createServiceClient()
  const { data: prospect } = await db.from('prospects').select('id, status, phone').eq('phone_key', phoneKey(args.phone)).maybeSingle()
  if (!prospect) return false
  // Ya es cliente: lo atiende su negocio, no ventas
  if (prospect.status === 'won') return false
  // Pidió que no le escribamos: se respeta en silencio
  if (prospect.status === 'opted_out') return true

  // Respuesta automática del negocio (bienvenida, ausencia, horario): no es una persona. No se guarda, no cambia
  // el estado del prospecto y no se le contesta, para no hablarle a un bot ni inflar las respuestas.
  if (isAutoReply(args.text)) {
    console.log('[sales] respuesta automática ignorada de', prospect.id)
    return true
  }

  if (args.msgId) {
    const { data: dup } = await db.from('prospect_messages').select('id').eq('ultramsg_id', args.msgId).maybeSingle()
    if (dup) return true
  }

  await db.from('prospect_messages').insert({ prospect_id: prospect.id, role: 'user', kind: 'chat', content: args.text, ultramsg_id: args.msgId || null })
  await db.from('prospects').update({
    last_inbound_at: new Date().toISOString(),
    // Si ya había avanzado (interesado, negociando…) se conserva; si solo estaba contactado o perdido, pasa a "contestó"
    ...(['new', 'contacted', 'lost', 'invalid'].includes(prospect.status) ? { status: 'replied' } : {}),
  }).eq('id', prospect.id)

  // Pedir que no le escriban se atiende sin IA y de inmediato
  if (isOptOut(args.text)) {
    await db.from('prospects').update({ status: 'opted_out' }).eq('id', prospect.id)
    const bye = 'Entendido, no te volveremos a escribir. Disculpa la molestia y que tengas excelente día.'
    await db.from('prospect_messages').insert({ prospect_id: prospect.id, role: 'assistant', kind: 'chat', content: bye })
    await sendMessage(prospect.phone, bye, creds)
    return true
  }

  // Si ya está con una persona del equipo, el agente no interviene
  if (prospect.status === 'handoff') return true

  const reply = await runSalesAgent(prospect.id, cfg)
  if (reply) await sendMessage(prospect.phone, reply, creds)
  return true
}
