import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage, sendImage, type UltramsgCreds } from '@/lib/ultramsg'
import { waId } from '@/lib/payment-links'

const EXPIRE_HOURS = 24
const WHY: Record<string, string> = { receta: 'Medicamento', controlado: 'Medicamento controlado', urgencia: 'URGENCIA', queja: 'Queja', hablar_con_persona: 'Pide hablar con una persona', otro: 'Consulta' }

interface OrgCtx { id: string; name: string; whatsapp_number: string | null; creds: UltramsgCreds }

/**
 * El bot le consulta algo al responsable. Si el cliente ya tiene una consulta abierta, se agrega a esa (mismo código)
 * para no llenarlo de avisos. El cliente NO recibe nada de esto: el bot sigue siendo su voz.
 */
export async function createOwnerConsult(org: OrgCtx, input: { customerPhone: string; customerName?: string; reason: string; question: string; imageUrl?: string }): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (!org.whatsapp_number) return { ok: false, error: 'El negocio no tiene número del responsable configurado' }
  const db = createServiceClient()
  const since = new Date(Date.now() - EXPIRE_HOURS * 3600_000).toISOString()
  const question = String(input.question ?? '').trim().slice(0, 500)
  if (question.length < 3) return { ok: false, error: 'Falta la consulta' }

  const { data: open } = await db.from('owner_consults').select('id, code, question').eq('organization_id', org.id).eq('status', 'pending').gte('created_at', since)
  const { data: existing } = await db.from('owner_consults').select('id, code, question').eq('organization_id', org.id).eq('customer_phone', input.customerPhone).eq('status', 'pending').gte('created_at', since).maybeSingle()

  let code: string
  if (existing) {
    code = existing.code
    await db.from('owner_consults').update({ question: `${existing.question}\n+ ${question}`.slice(0, 900) }).eq('id', existing.id)
  } else {
    const used = new Set((open ?? []).map(c => c.code))
    code = ''
    for (let i = 0; i < 20 && (!code || used.has(code)); i++) code = String(Math.floor(1000 + Math.random() * 9000))
    if (used.has(code)) return { ok: false, error: 'No se pudo registrar la consulta' }
    const { error } = await db.from('owner_consults').insert({ organization_id: org.id, code, customer_phone: input.customerPhone, customer_name: input.customerName?.slice(0, 80) || null, reason: input.reason, question })
    if (error) { console.error('[owner-consults] insert', error.message); return { ok: false, error: 'No se pudo registrar la consulta' } }
  }

  const phone = input.customerPhone.replace(/\D/g, '')
  const to = `${waId(org.whatsapp_number)}@c.us`
  await sendMessage(to,
    `🔔 *${WHY[input.reason] ?? 'Consulta'}* · código ${code}\n${input.customerName ? `Cliente: ${input.customerName}\n` : ''}Teléfono: +${phone}\n\n${question}\n\n*Respóndeme aquí* y yo se lo comunico al cliente. Si hay varias consultas abiertas, empieza con el código (${code} tu respuesta).\n\nSi prefieres escribirle tú, hazlo desde el teléfono de la línea: el bot se calla 6 horas en ese chat (escribe /bot para reactivarlo).`,
    org.creds
  ).catch(e => console.error('[owner-consults] aviso falló', e))
  if (input.imageUrl) await sendImage(to, input.imageUrl, `Foto de +${phone}${input.customerName ? ` (${input.customerName})` : ''} · código ${code}`, org.creds).catch(e => console.error('[owner-consults] foto no reenviada', e))
  return { ok: true, code }
}

/**
 * Mensaje del responsable al bot. Si hay consultas abiertas, es la respuesta: se le pasa al cliente con las palabras del bot.
 * Devuelve true si se atendió como respuesta (el mensaje no sigue el flujo normal).
 * `relay` genera y envía el mensaje al cliente (lo pasa quien llama, para no depender del agente aquí).
 */
export async function handleOwnerAnswer(org: OrgCtx, text: string, relay: (customerPhone: string, answer: string, customerName: string | null) => Promise<'sent' | 'paused'>): Promise<boolean> {
  const db = createServiceClient()
  const since = new Date(Date.now() - EXPIRE_HOURS * 3600_000).toISOString()
  const { data: pend } = await db.from('owner_consults').select('*').eq('organization_id', org.id).eq('status', 'pending').gte('created_at', since).order('created_at')
  const list = pend ?? []
  if (list.length === 0) return false

  const ownerTo = `${waId(org.whatsapp_number ?? '')}@c.us`
  const t = text.trim()
  const withCode = t.match(/^(\d{4})\s*[:\-–]?\s+([\s\S]+)$/)
  let consult = withCode ? list.find(c => c.code === withCode[1]) : undefined
  let answer = withCode && consult ? withCode[2].trim() : t
  if (!consult) {
    if (list.length === 1) consult = list[0]
    else {
      const lines = list.map(c => `• ${c.code}: ${c.customer_name || '+' + c.customer_phone} — ${String(c.question).split('\n')[0].slice(0, 80)}`).join('\n')
      await sendMessage(ownerTo, `Tienes ${list.length} consultas abiertas. Empieza tu respuesta con el código:\n${lines}`, org.creds).catch(() => {})
      return true
    }
  }
  if (!answer) return true

  // Reclama la consulta de forma atómica: dos mensajes seguidos no la responden dos veces
  const { data: claimed } = await db.from('owner_consults').update({ status: 'answered', answer: answer.slice(0, 1000), answered_at: new Date().toISOString() }).eq('id', consult.id).eq('status', 'pending').select('id')
  if (!claimed?.length) return true

  let outcome: 'sent' | 'paused' = 'sent'
  try { outcome = await relay(consult.customer_phone, answer, consult.customer_name) }
  catch (err) {
    console.error('[owner-consults] no se pudo comunicar al cliente', err)
    await db.from('owner_consults').update({ status: 'pending', answered_at: null }).eq('id', consult.id)
    await sendMessage(ownerTo, `⚠️ No pude pasarle tu respuesta a ${consult.customer_name || '+' + consult.customer_phone}. Intenta enviarla otra vez.`, org.creds).catch(() => {})
    return true
  }
  await sendMessage(ownerTo, outcome === 'paused'
    ? `Ese chat está en pausa porque alguien le escribió a mano: no le pasé tu respuesta. Escríbele tú desde el teléfono de la línea o manda /bot en ese chat para reactivarme.`
    : `✅ Listo, se lo comuniqué a ${consult.customer_name || '+' + consult.customer_phone}.`, org.creds).catch(() => {})
  return true
}
