import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { createOfferToken } from '@/lib/offer'
import { PLANS, ASSISTANT, PREPAID_MONTHS, TRIAL_DAYS, money, planKeyFor, segmentForType } from '@/lib/plans'
import { buildSalesPrompt, buildOpeningPrompt, type ProspectCtx } from '@/lib/sales/prompt'
import { salesCreds, type SalesConfig } from '@/lib/sales/config'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'
const baseUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'

export interface ProspectRow extends ProspectCtx {
  id: string
  phone: string
  followups_sent: number
}

export const salesTools: Tool[] = [
  {
    name: 'get_pricing',
    description: 'Devuelve los precios y condiciones reales de QuickTurno para el giro de este negocio. Llámala antes de mencionar cualquier precio.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_register_link',
    description: 'Devuelve el enlace de registro de QuickTurno para este negocio. Úsalo cuando quiera probar o contratar.',
    input_schema: {
      type: 'object' as const,
      properties: { with_assistant: { type: 'boolean', description: 'true si quiere el plan con Asistente de WhatsApp (sin prueba gratis); false para el básico con 7 días gratis.' } },
      required: [],
    },
  },
  {
    name: 'create_discount_link',
    description: 'Genera el enlace con 25% de descuento en el primer mes, válido 24 horas. Solo se da UNA vez por negocio, cuando ya mostró interés y objeta el precio.',
    input_schema: {
      type: 'object' as const,
      properties: { with_assistant: { type: 'boolean', description: 'true para el plan con Asistente de WhatsApp; false para el básico.' } },
      required: ['with_assistant'],
    },
  },
  {
    name: 'set_status',
    description: 'Actualiza en qué punto va la conversación con este negocio.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['replied', 'interested', 'negotiating', 'lost'], description: 'replied: contestó; interested: quiere probar; negotiating: habla de precio; lost: no le interesa.' },
        note: { type: 'string', description: 'Nota breve para el dueño (opcional).' },
      },
      required: ['status'],
    },
  },
  {
    name: 'handoff_to_human',
    description: 'Pasa la conversación a una persona del equipo. Úsalo cuando pidan descuento mayor, precio especial, factura, contrato, varias sucursales, una llamada o demostración, o si hay una queja.',
    input_schema: { type: 'object' as const, properties: { reason: { type: 'string', description: 'Qué necesita el negocio, en una frase.' } }, required: ['reason'] },
  },
  {
    name: 'opt_out',
    description: 'El negocio pidió que no le escribamos más o se molestó. Deja de contactarlo para siempre.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
]

async function notifyOwner(cfg: SalesConfig, text: string) {
  const creds = salesCreds(cfg)
  if (!creds || !cfg.owner_phone) return
  await sendMessage(cfg.owner_phone, text, creds).catch(err => console.error('[sales] aviso al dueño falló:', err))
}

/** Ejecuta una herramienta del agente. Aquí viven los límites: lo que no está aquí, el agente no lo puede prometer. */
export async function handleSalesTool(name: string, input: Record<string, unknown>, p: ProspectRow, cfg: SalesConfig): Promise<string> {
  const db = createServiceClient()
  const segment = segmentForType(p.segment)

  switch (name) {
    case 'get_pricing': {
      const basic = PLANS[planKeyFor(segment, false)]
      const withBot = PLANS[planKeyFor(segment, true)]
      return JSON.stringify({
        plan_basico: { nombre: basic.name.replace('Turno — ', ''), precio_mensual: basic.priceLabel + ' MXN', incluye: basic.features, prueba_gratis: `${TRIAL_DAYS} días (se registra tarjeta, hoy no se cobra y se puede cancelar antes sin pagar)` },
        plan_con_asistente: { nombre: withBot.name.replace('Turno — ', ''), precio_mensual: withBot.priceLabel + ' MXN', el_asistente_suma: money(ASSISTANT.amountBySegment[segment]) + ' al mes', prueba_gratis: 'no incluye; se cobra desde el primer día' },
        prepago: `Se puede pagar por adelantado ${PREPAID_MONTHS.join(' o ')} meses con OXXO o transferencia SPEI, sin renovación automática.`,
        cancelacion: 'Sin contratos ni permanencia; se cancela desde Configuración.',
      })
    }

    case 'get_register_link': {
      const key = planKeyFor(segment, input.with_assistant === true)
      const type = p.segment && p.segment !== 'other' ? `&type=${p.segment}` : ''
      return JSON.stringify({ enlace: `${baseUrl()}/register?plan=${key}${type}` })
    }

    case 'create_discount_link': {
      if (p.offer_link) return JSON.stringify({ error: 'Este negocio ya recibió un enlace con descuento. No se puede dar otro.', enlace_anterior: p.offer_link })
      const key = planKeyFor(segment, input.with_assistant === true)
      const { token } = createOfferToken(key)
      const link = `${baseUrl()}/oferta/${token}`
      await db.from('prospects').update({ offer_link: link, status: 'negotiating' }).eq('id', p.id)
      p.offer_link = link
      return JSON.stringify({ enlace: link, condiciones: '25% de descuento solo en el primer mes. Válido 24 horas.' })
    }

    case 'set_status': {
      const status = String(input.status)
      if (!['replied', 'interested', 'negotiating', 'lost'].includes(status)) return JSON.stringify({ error: 'Estado no permitido' })
      await db.from('prospects').update({ status, ...(input.note ? { notes: String(input.note).slice(0, 500) } : {}) }).eq('id', p.id)
      return JSON.stringify({ ok: true })
    }

    case 'handoff_to_human': {
      const reason = String(input.reason ?? '').slice(0, 300)
      await db.from('prospects').update({ status: 'handoff', handoff_reason: reason }).eq('id', p.id)
      await notifyOwner(cfg, `Prospecto que necesita a una persona\n\nNegocio: ${p.name}\nTeléfono: ${p.phone}\nMotivo: ${reason}`)
      return JSON.stringify({ ok: true, instruccion: 'Dile al negocio que una persona del equipo le escribirá pronto.' })
    }

    case 'opt_out': {
      await db.from('prospects').update({ status: 'opted_out' }).eq('id', p.id)
      return JSON.stringify({ ok: true, instruccion: 'Despídete con una sola frase amable. No vuelvas a escribirle.' })
    }
  }
  return JSON.stringify({ error: `Herramienta desconocida: ${name}` })
}

/** Contesta el mensaje más reciente del prospecto (ya guardado). Devuelve el texto a enviar o null si no hay nada que enviar. */
export async function runSalesAgent(prospectId: string, cfg: SalesConfig): Promise<string | null> {
  const db = createServiceClient()
  const { data: p } = await db.from('prospects').select('*').eq('id', prospectId).single()
  if (!p) return null
  const prospect = p as ProspectRow

  const { data: history } = await db
    .from('prospect_messages')
    .select('role, content')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(30)
  const past = (history ?? []).reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  // La API exige empezar con un mensaje del otro lado: el primer mensaje lo mandamos nosotros
  if (past.length && past[0].role === 'assistant') past.unshift({ role: 'user', content: '[Inicio de la conversación: tú contactaste primero a este negocio]' })
  const messages: MessageParam[] = past

  let text: string
  try {
    let response = await anthropic.messages.create({ model: MODEL, max_tokens: 700, system: buildSalesPrompt(prospect), tools: salesTools, messages })
    while (response.stop_reason === 'tool_use') {
      const results = await Promise.all(
        response.content.filter(b => b.type === 'tool_use').map(async b => {
          if (b.type !== 'tool_use') return null
          let result: string
          try { result = await handleSalesTool(b.name, b.input as Record<string, unknown>, prospect, cfg) }
          catch (err) { console.error('[sales] herramienta falló:', b.name, err); result = JSON.stringify({ error: 'La herramienta falló' }) }
          return { type: 'tool_result' as const, tool_use_id: b.id, content: result }
        })
      )
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: results.filter(Boolean) as Anthropic.ToolResultBlockParam[] })
      response = await anthropic.messages.create({ model: MODEL, max_tokens: 700, system: buildSalesPrompt(prospect), tools: salesTools, messages })
    }
    text = response.content.find(b => b.type === 'text')?.text?.trim() ?? ''
  } catch (err) {
    console.error('[sales] el agente falló:', err)
    // Mejor no contestar nada que mandar un mensaje raro a un prospecto: se le avisa al dueño
    await notifyOwner(cfg, `El agente de ventas falló al contestar a ${prospect.name} (${prospect.phone}). Revisa la conversación.`)
    return null
  }
  if (!text) return null

  await db.from('prospect_messages').insert({ prospect_id: prospectId, role: 'assistant', kind: 'chat', content: text })
  await db.from('prospects').update({ last_contact_at: new Date().toISOString() }).eq('id', prospectId)
  return text
}

/** Primer mensaje a un negocio. Se genera con IA para que no sea una plantilla idéntica, con plan B fijo. */
export async function generateOpening(p: ProspectCtx): Promise<string> {
  const fallback = `Hola${p.contact_name ? ` ${p.contact_name}` : ''}, soy Turno, el asistente virtual de QuickTurno. Ayudamos a negocios como ${p.name} a contestar y agendar por WhatsApp las 24 horas. ¿Cómo manejan hoy sus citas o pedidos?`
  try {
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 300, messages: [{ role: 'user', content: buildOpeningPrompt(p) }] })
    const text = res.content.find(b => b.type === 'text')?.text?.trim().replace(/^["“]|["”]$/g, '')
    const words = text ? text.split(/\s+/).length : 0
    // Un mensaje vacío o larguísimo no sirve como primer contacto: se usa el texto fijo
    return text && words >= 15 && words <= 110 ? text : fallback
  } catch (err) {
    console.error('[sales] no se pudo generar la apertura, se usa el texto fijo:', err)
    return fallback
  }
}
