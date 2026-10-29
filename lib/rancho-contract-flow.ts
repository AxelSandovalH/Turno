import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage, sendDocument, type UltramsgCreds } from '@/lib/ultramsg'
import { buildContractPdf, contractMissing, type ContractData } from '@/lib/rancho-contract'
import { waId } from '@/lib/payment-links'

interface OwnerOrg { id: string; name: string; whatsapp_number: string | null; creds: UltramsgCreds }

const fileName = (d: ContractData) => `Contrato-Rancho-McCoy-${d.client_names[0]?.split(' ')[0] ?? 'evento'}-${d.event_date}`.replace(/[^A-Za-z0-9-]+/g, '-').replace(/-+/g, '-').slice(0, 80) + '.pdf'

/** Arma el PDF y se lo manda al responsable por WhatsApp para que lo revise y lo reenvíe al cliente. */
export async function sendContractToOwner(org: OwnerOrg, data: ContractData, caption: string): Promise<boolean> {
  if (!org.whatsapp_number) return false
  const pdf = await buildContractPdf(data)
  const res = await sendDocument(`${waId(org.whatsapp_number)}@c.us`, Buffer.from(pdf).toString('base64'), fileName(data), caption, org.creds)
  return !(res as { error?: unknown })?.error
}

/** Anticipo de un evento pagado: genera el contrato con los datos de la cotización y se lo manda al responsable. */
export async function contractAfterDeposit(org: OwnerOrg, req: { customer_name: string | null; customer_phone: string; event_data: Record<string, unknown> | null }) {
  const e = req.event_data as (Partial<ContractData> & { total_mxn?: number; deposit_mxn?: number }) | null
  if (!e) return
  const data = { ...e, client_names: e.client_names?.length ? e.client_names : [req.customer_name || req.customer_phone], total: Number(e.total_mxn ?? e.total), deposit_paid: Number(e.deposit_mxn ?? e.deposit_paid) } as ContractData
  if (contractMissing(data).length) return
  const ok = await sendContractToOwner(org, data, `📄 Contrato de ${data.client_names[0]} (${data.event_type}, ${data.event_date}) listo para revisar. Se generó al recibirse el anticipo. Revísalo y reenvíaselo al cliente para su firma.`)
  if (!ok) await sendMessage(`${waId(org.whatsapp_number ?? '')}@c.us`, `⚠️ Se pagó el anticipo de ${data.client_names[0]} pero no pude enviarte el contrato. Escríbeme "contrato ${data.client_names[0]}" con los datos del evento y lo genero.`, org.creds).catch(() => {})
}

const SCHEMA = {
  type: 'object' as const,
  properties: {
    client_names: { type: 'array', items: { type: 'string' }, description: 'Nombre(s) completos del cliente.' },
    event_type: { type: 'string', description: 'Boda, cumpleaños, quinceañera, etc.' },
    event_date: { type: 'string', description: 'Fecha del evento escrita como "12 de diciembre de 2026".' },
    guests: { type: 'number' },
    hours: { type: 'number', description: 'Horas de renta del recinto, si las mencionan.' },
    schedule: { type: 'string', description: 'Horario del evento si lo dan (ej. "7:30 pm a 3:30 am").' },
    cabins: { type: 'number', description: 'Número de cabañas.' },
    horse_participations: { type: 'number' },
    horse_photo_sessions: { type: 'number' },
    banquet_menu: { type: 'string' },
    banquet_per_person: { type: 'number' },
    staff: { type: 'string', description: 'Personal de servicio (meseros, bartender, horas).' },
    audio_lighting: { type: 'string' },
    decor: { type: 'array', items: { type: 'string' } },
    items: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, amount: { type: 'number' } }, required: ['label'] }, description: 'Desglose económico si lo dan.' },
    total: { type: 'number', description: 'Inversión total en MXN.' },
    deposit_paid: { type: 'number', description: 'Anticipo recibido en MXN.' },
    balance_days: { type: 'number', description: 'Días naturales antes del evento para liquidar el saldo.' },
    extra_clauses: { type: 'array', items: { type: 'string' }, description: 'Condiciones especiales que pidan agregar.' },
  },
  required: [],
}

/**
 * El responsable escribe "contrato ..." con los datos del evento y el sistema le devuelve el PDF. Devuelve true si atendió el mensaje.
 * Un modelo solo EXTRAE los datos del texto (no inventa): lo que falte se le pide; los números salen tal cual los dijo.
 */
export async function handleOwnerContract(org: OwnerOrg, text: string): Promise<boolean> {
  if (!/^\s*contrato\b/i.test(text)) return false
  const to = `${waId(org.whatsapp_number ?? '')}@c.us`
  const say = (m: string) => sendMessage(to, m, org.creds).catch(() => {})

  let got: Record<string, unknown> | null = null
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1500,
      system: 'Extrae los datos de un contrato de evento de Rancho McCoy del mensaje del propietario. Usa SOLO lo que el mensaje dice; si un dato no está, déjalo fuera. No inventes, no calcules, no corrijas montos. Montos en pesos MXN.',
      tools: [{ name: 'datos_contrato', description: 'Datos del contrato', input_schema: SCHEMA }],
      tool_choice: { type: 'tool', name: 'datos_contrato' },
      messages: [{ role: 'user', content: text }],
    })
    const tu = r.content.find(b => b.type === 'tool_use')
    got = tu && tu.type === 'tool_use' ? (tu.input as Record<string, unknown>) : null
  } catch (err) { console.error('[contrato] no se pudo leer el mensaje', err) }
  if (!got) { await say('No pude leer los datos del contrato. Escríbelos así: "contrato Hugo Cruz, cumpleaños, 12 de diciembre de 2026, 70 invitados, total 27400, anticipo 10400".'); return true }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = got as Record<string, any>
  const data: Partial<ContractData> = {
    client_names: g.client_names, event_type: g.event_type, event_date: g.event_date, guests: g.guests, hours: g.hours, schedule: g.schedule,
    cabins: g.cabins ? { count: g.cabins } : undefined,
    horses: g.horse_participations || g.horse_photo_sessions ? { participations: g.horse_participations, photo_sessions: g.horse_photo_sessions } : undefined,
    banquet: g.banquet_menu || g.banquet_per_person ? { menu: g.banquet_menu, per_person: g.banquet_per_person } : undefined,
    staff: g.staff, audio_lighting: g.audio_lighting, decor: g.decor, items: g.items, total: g.total, deposit_paid: g.deposit_paid, balance_days: g.balance_days, extra_clauses: g.extra_clauses,
  }

  // Si dio el nombre de un cliente que ya pagó el anticipo por el bot, se completan los datos faltantes desde esa cotización
  const missing0 = contractMissing(data)
  if (missing0.length && data.client_names?.[0]) {
    const db = createServiceClient()
    const { data: rows } = await db.from('payment_link_requests').select('customer_name, event_data, status')
      .eq('organization_id', org.id).not('event_data', 'is', null).ilike('customer_name', `%${data.client_names[0].split(' ')[0]}%`).order('created_at', { ascending: false }).limit(1)
    const e = rows?.[0]?.event_data as (Partial<ContractData> & { total_mxn?: number; deposit_mxn?: number }) | undefined
    if (e) {
      data.event_type ||= e.event_type; data.event_date ||= e.event_date; data.guests ||= e.guests; data.items ||= e.items; data.cabins ||= e.cabins; data.horses ||= e.horses
      data.staff ||= e.staff; data.audio_lighting ||= e.audio_lighting; data.hours ||= e.hours
      data.total ||= e.total_mxn ?? e.total
      if (data.deposit_paid == null && rows?.[0]?.status === 'paid') data.deposit_paid = e.deposit_mxn ?? e.deposit_paid
    }
  }

  const missing = contractMissing(data)
  if (missing.length) {
    await say(`Para el contrato me falta: ${missing.join(', ')}.\n\nEscríbelo todo en un mensaje, por ejemplo:\n"contrato Hugo Cruz, cumpleaños, 12 de diciembre de 2026, 70 invitados, total 27400, anticipo 10400, 2 cabañas, 2 participaciones de caballos"`)
    return true
  }
  const ok = await sendContractToOwner(org, data as ContractData, `📄 Contrato de ${data.client_names![0]} (${data.event_type}, ${data.event_date}). Revísalo y reenvíaselo al cliente para su firma.`)
  if (!ok) await say('No pude enviar el PDF. Intenta de nuevo en unos minutos.')
  return true
}
