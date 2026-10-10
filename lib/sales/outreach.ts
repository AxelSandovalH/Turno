import { fromZonedTime } from 'date-fns-tz'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { getSalesConfig, salesCreds } from '@/lib/sales/config'
import { generateOpening } from '@/lib/sales/agent'
import type { ProspectCtx } from '@/lib/sales/prompt'

const OPT_OUT_LINE = 'Si prefieres que no te escriba, respóndeme "no" y no vuelvo a hacerlo.'
const MAX_PER_RUN = 3
const DAY = 24 * 3600_000

/** Inicio del día de hoy (en la zona del negocio) como fecha UTC. */
function localDayStart(now: Date, tz: string): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  return fromZonedTime(`${ymd}T00:00:00`, tz)
}

function followupText(name: string | null, bizName: string, n: number): string {
  const hi = `Hola${name ? ` ${name}` : ''}`
  if (n === 0) return `${hi}, retomo mi mensaje de hace unos días. ¿Te gustaría ver cómo funcionaría QuickTurno en ${bizName}? Son 7 días gratis y hoy no se cobra nada. ${OPT_OUT_LINE}`
  return `${hi}, es mi último mensaje: si en algún momento quieres que WhatsApp conteste y agende solo en ${bizName}, aquí sigo. Más información en quickturno.app. Gracias por tu tiempo.`
}

export interface OutreachResult { sent: number; followups: number; skipped?: string }

/**
 * Una pasada de envíos en frío: respeta el tiempo de encendido, el tope diario y manda pocos
 * mensajes por pasada con pausas entre ellos. Primero seguimientos, luego negocios nuevos.
 */
export async function runOutreach(opts: { now?: Date; sleep?: (ms: number) => Promise<void> } = {}): Promise<OutreachResult> {
  const now = opts.now ?? new Date()
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)))
  const cfg = await getSalesConfig()
  if (!cfg?.enabled) return { sent: 0, followups: 0, skipped: 'ventas apagadas' }
  const creds = salesCreds(cfg)
  if (!creds) return { sent: 0, followups: 0, skipped: 'sin instancia configurada' }

  const db = createServiceClient()

  // Encendido con duración: al llegar a la hora límite el agente se apaga solo
  if (cfg.run_until && now.getTime() >= new Date(cfg.run_until).getTime()) {
    await db.from('sales_config').update({ enabled: false, run_until: null }).eq('id', 1)
    return { sent: 0, followups: 0, skipped: 'terminó el tiempo de encendido' }
  }

  // Sin respuesta tras todos los seguimientos: se cierra el prospecto
  const staleBefore = new Date(now.getTime() - cfg.followup_after_days * DAY).toISOString()
  await db.from('prospects').update({ status: 'lost', notes: 'Sin respuesta tras los seguimientos' })
    .eq('status', 'contacted').gte('followups_sent', cfg.max_followups).lt('last_contact_at', staleBefore)

  // Tope diario: nuevos + seguimientos enviados hoy
  const { data: today } = await db.from('prospect_messages').select('id').in('kind', ['first', 'followup']).gte('created_at', localDayStart(now, cfg.timezone).toISOString())
  const remaining = cfg.daily_limit - (today ?? []).length
  if (remaining <= 0) return { sent: 0, followups: 0, skipped: 'tope diario alcanzado' }
  let budget = Math.min(remaining, MAX_PER_RUN)

  const { data: followupRows } = await db.from('prospects').select('*')
    .eq('status', 'contacted').lt('followups_sent', cfg.max_followups).lt('last_contact_at', staleBefore)
    .order('last_contact_at', { ascending: true }).limit(budget)
  const followupList = followupRows ?? []
  budget -= followupList.length
  const { data: newRows } = budget > 0
    ? await db.from('prospects').select('*').eq('status', 'new').order('created_at', { ascending: true }).limit(budget)
    : { data: [] }

  const jobs = [...followupList.map(p => ({ p, kind: 'followup' as const })), ...(newRows ?? []).map(p => ({ p, kind: 'first' as const }))]
  let sent = 0, followups = 0

  for (const [i, { p, kind }] of jobs.entries()) {
    const ctx: ProspectCtx = { name: p.name, contact_name: p.contact_name, segment: p.segment, city: p.city, status: p.status, offer_link: p.offer_link }
    const body = kind === 'first'
      ? `${await generateOpening(ctx)}\n\n${OPT_OUT_LINE}`
      : followupText(p.contact_name, p.name, p.followups_sent)

    const res = await sendMessage(p.phone, body, creds).catch(err => ({ error: String(err) }))
    if ((res as { error?: unknown })?.error) {
      console.error('[sales] envío falló para', p.id, res)
      // Número que no recibe mensajes: se descarta para no seguir intentando
      await db.from('prospects').update({ status: 'invalid', notes: 'No se pudo enviar el mensaje (¿número sin WhatsApp?)' }).eq('id', p.id)
      continue
    }

    await db.from('prospect_messages').insert({ prospect_id: p.id, role: 'assistant', kind, content: body })
    await db.from('prospects').update({
      status: 'contacted',
      last_contact_at: now.toISOString(),
      ...(kind === 'first' ? { first_contacted_at: now.toISOString() } : { followups_sent: p.followups_sent + 1 }),
    }).eq('id', p.id)
    sent++
    if (kind === 'followup') followups++

    // Pausa entre mensajes (12 a 25 s): enviar en ráfaga es lo que hace que bloqueen un número
    if (i < jobs.length - 1) await sleep(12000 + Math.floor(Math.random() * 13000))
  }
  return { sent, followups }
}
