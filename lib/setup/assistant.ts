import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { createServiceClient } from '@/lib/supabase/service'
import { getProfile, hasCapability } from '@/lib/profiles/registry'

const MODEL = 'claude-sonnet-4-6'
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface SetupMessage { role: 'user' | 'assistant'; content: string }
export interface SetupResult { reply: string; changes: string[] }

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[ \t]+/g, ' ').trim().slice(0, max) : '')
const int = (v: unknown, min: number, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null }
const hhmm = (v: unknown) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null)
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const TOOLS: Anthropic.Tool[] = [
  { name: 'get_setup_state', description: 'Lee cómo está hoy el negocio: datos generales, servicios (activos y borradores), equipo y horarios. Llámala al empezar y cuando necesites confirmar un cambio.', input_schema: { type: 'object', properties: {} } },
  {
    name: 'save_service', description: 'Crea un servicio o edita uno existente (con id). is_active=true lo publica en la página de reservas.',
    input_schema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, price: { type: 'number', description: 'Pesos MXN' }, duration_minutes: { type: 'number' }, is_active: { type: 'boolean' } }, required: ['name', 'price', 'duration_minutes'] },
  },
  { name: 'remove_service', description: 'Quita un servicio de la página de reservas (lo desactiva; no borra el historial).', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  {
    name: 'save_staff', description: 'Agrega a una persona del equipo o edita a una existente (con id).',
    input_schema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, role: { type: 'string', description: 'Etiqueta libre: Barbero, Terapeuta, Doctor...' } }, required: ['name'] },
  },
  {
    name: 'set_schedule', description: 'Define el horario semanal de una persona del equipo: los días con su hora de inicio y fin (formato 24 h HH:MM). Reemplaza lo que tuviera en esos días. closed_days los deja sin horario.',
    input_schema: { type: 'object', properties: { staff_id: { type: 'string' }, days: { type: 'array', items: { type: 'number' }, description: '0=domingo ... 6=sábado' }, start_time: { type: 'string' }, end_time: { type: 'string' }, closed_days: { type: 'array', items: { type: 'number' } } }, required: ['staff_id'] },
  },
  {
    name: 'update_profile', description: 'Actualiza datos del negocio: dirección, mensaje de bienvenida y de ausencia del bot, y color de marca (#rrggbb).',
    input_schema: { type: 'object', properties: { address: { type: 'string' }, welcome_message: { type: 'string' }, away_message: { type: 'string' }, primary_color: { type: 'string' } } },
  },
]

function systemPrompt(org: { name: string; slug: string; business_type: string }, usesAgenda: boolean) {
  const profile = getProfile(org.business_type)
  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://quickturno.app'}/book/${org.slug}`
  return `Eres el asistente de configuración de QuickTurno. Ayudas al dueño de "${org.name}" (giro: ${profile.displayName}) a dejar listo su negocio para recibir clientes, conversando y aplicando los cambios por él.

Qué puedes configurar con tus herramientas: ${usesAgenda ? 'servicios (nombre, descripción, precio, duración), equipo, horarios semanales,' : ''} dirección, color de marca y mensajes del bot de WhatsApp.
${usesAgenda ? `Su página pública de reservas es ${link}.` : 'Este negocio recibe pedidos: su menú se arma en el módulo Menú; aquí solo puedes ayudar con los datos del negocio.'}
Lo que NO puedes hacer tú: subir el logo o las fotos de los servicios (se hace en Configuración y en Servicios), conectar WhatsApp (módulo WhatsApp) ni cobrar. Si lo necesita, dile dónde hacerlo.

Cómo trabajas:
1. Al empezar, llama get_setup_state y haz un resumen corto de lo que ya hay. Si hay servicios en borrador (is_active=false), son de EJEMPLO armados por la IA con su descripción: sus precios y duraciones NO están confirmados. Repásalos con el dueño uno por uno o todos juntos y pregunta si los precios son correctos ANTES de publicarlos.
2. Avanza en orden y una cosa a la vez: servicios, equipo, horarios, datos del negocio (dirección, color, mensajes del bot). Máximo una pregunta por mensaje.
3. Aplica un cambio solo cuando el dueño lo confirmó o lo pidió claramente. Después de aplicarlo, dilo en una frase. Nunca inventes precios, horarios, direcciones ni nombres de personas: si falta un dato, pregúntalo.
4. Si algo no se pudo guardar, dilo con claridad.
5. Al terminar los pasos básicos, di que su página ya está lista y comparte el enlace.

Estilo: español de México, cercano y breve (máximo 4 líneas), sin emojis, sin listas largas. Si preguntan algo fuera de configurar su negocio, responde breve y vuelve al tema.`
}

export async function runSetupAssistant(orgId: string, history: SetupMessage[]): Promise<SetupResult> {
  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('name, slug, business_type').eq('id', orgId).single()
  if (!org) throw new Error('Negocio no encontrado')
  const usesAgenda = hasCapability(org.business_type, 'appointments')
  const changes: string[] = []

  async function ownsStaff(id: string) {
    const { data } = await db.from('staff').select('id').eq('id', id).eq('organization_id', orgId).maybeSingle()
    return !!data
  }

  async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
      case 'get_setup_state': {
        const [{ data: o }, { data: services }, { data: staff }, { data: sched }] = await Promise.all([
          db.from('organizations').select('name, slug, business_type, address, welcome_message, away_message, primary_color, logo_url, whatsapp_bot_enabled').eq('id', orgId).single(),
          db.from('services').select('id, name, description, price, duration_minutes, is_active').eq('organization_id', orgId).order('created_at'),
          db.from('staff').select('id, name, role, is_active, is_owner').eq('organization_id', orgId).order('created_at'),
          db.from('staff_schedules').select('staff_id, day_of_week, start_time, end_time').eq('organization_id', orgId),
        ])
        const hours = (staff ?? []).map(s => ({
          staff_id: s.id,
          days: (sched ?? []).filter(b => b.staff_id === s.id).sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
            .map(b => `${DAYS[b.day_of_week]} ${String(b.start_time).slice(0, 5)}-${String(b.end_time).slice(0, 5)}`),
        }))
        return JSON.stringify({ negocio: o, servicios: services ?? [], equipo: staff ?? [], horarios: hours })
      }
      case 'save_service': {
        if (!usesAgenda) return JSON.stringify({ error: 'Este negocio no usa servicios con agenda' })
        const name = str(input.name, 60), duration = int(input.duration_minutes, 5, 600), price = int(input.price, 0, 50000)
        if (!name || duration === null || price === null) return JSON.stringify({ error: 'Faltan nombre, precio o duración válidos' })
        const row = { name, description: str(input.description, 200) || null, duration_minutes: duration, price, is_active: input.is_active !== false }
        const id = str(input.id, 40)
        const { error } = id
          ? await db.from('services').update(row).eq('id', id).eq('organization_id', orgId)
          : await db.from('services').insert({ ...row, organization_id: orgId })
        if (error) return JSON.stringify({ error: 'No se pudo guardar el servicio' })
        changes.push(`${id ? 'Servicio actualizado' : 'Servicio creado'}: ${name} · $${price}${row.is_active ? '' : ' (borrador)'}`)
        return JSON.stringify({ ok: true })
      }
      case 'remove_service': {
        const id = str(input.id, 40)
        const { data } = await db.from('services').update({ is_active: false }).eq('id', id).eq('organization_id', orgId).select('name').maybeSingle()
        if (!data) return JSON.stringify({ error: 'Servicio no encontrado' })
        changes.push(`Servicio quitado de la página: ${data.name}`)
        return JSON.stringify({ ok: true })
      }
      case 'save_staff': {
        const name = str(input.name, 60), role = str(input.role, 40) || 'Staff'
        if (!name) return JSON.stringify({ error: 'Falta el nombre' })
        const id = str(input.id, 40)
        const { error } = id
          ? await db.from('staff').update({ name, role }).eq('id', id).eq('organization_id', orgId)
          : await db.from('staff').insert({ organization_id: orgId, name, role, is_active: true })
        if (error) return JSON.stringify({ error: 'No se pudo guardar a la persona' })
        changes.push(`${id ? 'Equipo actualizado' : 'Persona agregada'}: ${name} (${role})`)
        return JSON.stringify({ ok: true })
      }
      case 'set_schedule': {
        const staffId = str(input.staff_id, 40)
        if (!(await ownsStaff(staffId))) return JSON.stringify({ error: 'Persona no encontrada' })
        const valid = (v: unknown) => (Array.isArray(v) ? [...new Set(v.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))] : [])
        const days = valid(input.days), closed = valid(input.closed_days)
        const start = hhmm(input.start_time), end = hhmm(input.end_time)
        if (days.length && (!start || !end || start >= end)) return JSON.stringify({ error: 'Horario no válido: usa HH:MM y que la hora de inicio sea menor que la de fin' })
        if (days.length || closed.length) await db.from('staff_schedules').delete().eq('staff_id', staffId).eq('organization_id', orgId).in('day_of_week', [...days, ...closed])
        if (days.length) {
          const { error } = await db.from('staff_schedules').insert(days.map(d => ({ organization_id: orgId, staff_id: staffId, day_of_week: d, start_time: start, end_time: end, is_working: true })))
          if (error) return JSON.stringify({ error: 'No se pudo guardar el horario' })
          changes.push(`Horario: ${days.map(d => DAYS[d]).join(', ')} de ${start} a ${end}`)
        }
        if (closed.length) changes.push(`Sin horario: ${closed.map(d => DAYS[d]).join(', ')}`)
        return JSON.stringify({ ok: true })
      }
      case 'update_profile': {
        const patch: Record<string, string | null> = {}
        if (input.address !== undefined) patch.address = str(input.address, 200) || null
        if (input.welcome_message !== undefined) patch.welcome_message = str(input.welcome_message, 500) || null
        if (input.away_message !== undefined) patch.away_message = str(input.away_message, 500) || null
        if (typeof input.primary_color === 'string' && /^#[0-9a-fA-F]{6}$/.test(input.primary_color)) patch.primary_color = input.primary_color
        if (!Object.keys(patch).length) return JSON.stringify({ error: 'No hay nada válido que actualizar' })
        const { error } = await db.from('organizations').update(patch).eq('id', orgId)
        if (error) return JSON.stringify({ error: 'No se pudo actualizar' })
        changes.push(`Datos del negocio actualizados: ${Object.keys(patch).map(k => ({ address: 'dirección', welcome_message: 'mensaje de bienvenida', away_message: 'mensaje de ausencia', primary_color: 'color de marca' } as Record<string, string>)[k]).join(', ')}`)
        return JSON.stringify({ ok: true })
      }
      default: return JSON.stringify({ error: 'Herramienta desconocida' })
    }
  }

  const messages: MessageParam[] = history.map(m => ({ role: m.role, content: m.content }))
  const system = systemPrompt(org, usesAgenda)
  let response = await anthropic.messages.create({ model: MODEL, max_tokens: 1024, system, tools: TOOLS, messages })
  for (let i = 0; i < 8 && response.stop_reason === 'tool_use'; i++) {
    const uses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    const results = await Promise.all(uses.map(async b => {
      let content: string
      try { content = await runTool(b.name, (b.input ?? {}) as Record<string, unknown>) }
      catch (err) { console.error('[setup] herramienta falló:', b.name, err); content = JSON.stringify({ error: 'La herramienta falló' }) }
      return { type: 'tool_result' as const, tool_use_id: b.id, content }
    }))
    messages.push({ role: 'assistant', content: response.content }, { role: 'user', content: results })
    response = await anthropic.messages.create({ model: MODEL, max_tokens: 1024, system, tools: TOOLS, messages })
  }
  const reply = response.content.find(b => b.type === 'text')?.text?.trim() || 'Listo. ¿Seguimos con lo siguiente?'
  return { reply, changes }
}
