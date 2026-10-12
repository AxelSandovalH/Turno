import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { phoneKey } from '@/lib/sales/phone'
import type { SalesConfig } from '@/lib/sales/config'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

/** ¿Quien escribe es el dueño de la plataforma (el teléfono de aviso de ventas)? */
export const isOwnerPhone = (phone: string, cfg: SalesConfig | null) =>
  !!cfg?.owner_phone && phoneKey(cfg.owner_phone) === phoneKey(phone)

/** Cifras actuales del negocio (solo totales y nombres de prospectos; nunca claves ni datos de clientes finales). */
async function snapshot(cfg: SalesConfig) {
  const db = createServiceClient()
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString()
  const [{ data: prospects }, { data: sent }, { data: orgs }] = await Promise.all([
    db.from('prospects').select('name, status, segment, city, handoff_reason, last_inbound_at').limit(2000),
    db.from('prospect_messages').select('kind').in('kind', ['first', 'followup']).gte('created_at', dayAgo),
    db.from('organizations').select('subscription_status, created_at').limit(2000),
  ])
  const count = <T,>(rows: T[] | null, key: (r: T) => string) => (rows ?? []).reduce<Record<string, number>>((a, r) => { const k = key(r); a[k] = (a[k] ?? 0) + 1; return a }, {})
  return {
    agente_de_ventas: { encendido: cfg.enabled, apagado_automatico: cfg.run_until, ultima_pasada: cfg.last_run_at, resultado_ultima_pasada: cfg.last_run_result, tope_diario: cfg.daily_limit },
    prospectos_por_estado: count(prospects, p => p.status),
    enviados_ultimas_24h: (sent ?? []).length,
    requieren_atencion_humana: (prospects ?? []).filter(p => p.status === 'handoff').map(p => ({ negocio: p.name, motivo: p.handoff_reason })),
    interesados_o_negociando: (prospects ?? []).filter(p => ['interested', 'negotiating'].includes(p.status)).map(p => ({ negocio: p.name, estado: p.status })),
    clientes_por_estado_de_suscripcion: count(orgs, o => o.subscription_status ?? 'sin_estado'),
    negocios_registrados_ultimos_7_dias: (orgs ?? []).filter(o => o.created_at >= weekAgo).length,
  }
}

/** Mensaje del dueño: contesta con el estado real del negocio. Siempre devuelve true (nunca cae a otro bot). */
export async function handleOwnerInbound(args: { text: string; phone: string; cfg: SalesConfig; creds?: { instance: string; token: string } }): Promise<true> {
  let reply: string
  try {
    const data = await snapshot(args.cfg)
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: `Eres el asistente interno de QuickTurno y hablas con el DUEÑO de la plataforma por WhatsApp. Contesta en español, breve y directo (máximo ~8 líneas), con las cifras reales de abajo y sin inventar nada: si algo no está en los datos, dilo. Sin markdown pesado; viñetas simples con guion si ayudan.\n\nDATOS ACTUALES (JSON):\n${JSON.stringify(data)}`,
      messages: [{ role: 'user', content: args.text }],
    })
    reply = res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('\n').trim() || 'No pude armar el resumen, intenta de nuevo.'
  } catch (err) {
    console.error('[owner] fallo al responder', err)
    reply = 'No pude consultar el estado ahora mismo. Revisa /admin/ventas.'
  }
  await sendMessage(args.phone, reply, args.creds)
  return true
}
