import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ── helpers ──────────────────────────────────────────────────────────────────

async function sendWhatsApp(to: string, body: string) {
  const instance = Deno.env.get('ULTRAMSG_INSTANCE')!
  const token = Deno.env.get('ULTRAMSG_TOKEN')!
  await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, to, body }),
  })
}

function buildSystemPrompt(org: { name: string; timezone: string; welcome_message: string | null }) {
  return `Eres la recepcionista virtual de "${org.name}". Tu nombre es Turno.

Tu único trabajo es ayudar a los clientes a:
1. Agendar citas
2. Consultar sus citas activas
3. Reagendar una cita existente
4. Cancelar una cita
5. Responder preguntas sobre servicios, precios y horarios

REGLAS ESTRICTAS:
- Responde SIEMPRE en español, de forma amable y concisa
- Nunca inventes disponibilidad — usa SOLO los slots que devuelve get_available_slots
- Nunca confirmes una cita sin haber llamado create_appointment exitosamente
- Si el cliente pregunta algo fuera de tu alcance (quejas, pagos, problemas), responde: "Para eso necesitas hablar directamente con el negocio."
- Mensajes cortos. Máximo 3-4 líneas por respuesta
- Usa listas numeradas cuando ofrezcas opciones de horario
- Timezone del negocio: ${org.timezone}

FLUJO DE RESERVA:
1. Pregunta qué servicio desea (si no lo mencionó)
2. Pregunta qué barbero prefiere, o si no importa
3. Pregunta qué fecha y hora prefiere
4. Llama get_available_slots con esos parámetros
5. Muestra máximo 5 opciones numeradas
6. El cliente elige un número
7. Confirma nombre del cliente si no lo tienes
8. Llama create_appointment
9. Confirma con los detalles completos

${org.welcome_message ? `MENSAJE DE BIENVENIDA PERSONALIZADO: ${org.welcome_message}` : ''}
`
}

const tools: Anthropic.Tool[] = [
  {
    name: 'get_business_info',
    description: 'Obtiene los servicios disponibles, precios y horarios del negocio.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_available_slots',
    description: 'Consulta los slots de tiempo disponibles para agendar una cita.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD.' },
        service_id: { type: 'string', description: 'ID del servicio.' },
        staff_id: { type: 'string', description: 'ID del barbero. Opcional.' },
      },
      required: ['date', 'service_id'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Crea una cita. Solo llamar cuando el cliente haya confirmado.',
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string' },
        customer_phone: { type: 'string' },
        service_id: { type: 'string' },
        staff_id: { type: 'string' },
        starts_at: { type: 'string', description: 'ISO 8601 UTC' },
      },
      required: ['customer_name', 'customer_phone', 'service_id', 'staff_id', 'starts_at'],
    },
  },
  {
    name: 'get_customer_appointments',
    description: 'Obtiene las citas activas del cliente.',
    input_schema: {
      type: 'object',
      properties: { customer_phone: { type: 'string' } },
      required: ['customer_phone'],
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancela una cita existente.',
    input_schema: {
      type: 'object',
      properties: {
        appointment_id: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['appointment_id'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: 'Reagenda una cita a un nuevo horario.',
    input_schema: {
      type: 'object',
      properties: {
        appointment_id: { type: 'string' },
        new_starts_at: { type: 'string' },
        new_staff_id: { type: 'string' },
      },
      required: ['appointment_id', 'new_starts_at'],
    },
  },
]

// ── tool executor ─────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, string>,
  ctx: { organizationId: string; branchId: string; timezone: string },
): Promise<string> {
  const db = supabase

  switch (name) {
    case 'get_business_info': {
      const [{ data: services }, { data: staff }] = await Promise.all([
        db.from('services').select('id, name, duration_minutes, price').eq('organization_id', ctx.organizationId).eq('is_active', true),
        db.from('staff').select('id, name').eq('organization_id', ctx.organizationId).eq('is_active', true),
      ])
      return JSON.stringify({ services, staff })
    }

    case 'get_available_slots': {
      const { date, service_id, staff_id } = input
      const { data: service } = await db.from('services').select('duration_minutes').eq('id', service_id).single()
      if (!service) return JSON.stringify({ error: 'Servicio no encontrado' })

      const duration = service.duration_minutes

      let staffList: { id: string; name: string }[] = []
      if (staff_id) {
        const { data } = await db.from('staff').select('id, name').eq('id', staff_id).single()
        if (data) staffList = [data]
      } else {
        const { data } = await db.from('staff').select('id, name').eq('organization_id', ctx.organizationId).eq('is_active', true)
        staffList = data ?? []
      }

      // Parse date in timezone using Temporal (available in Deno)
      const [year, month, day] = date.split('-').map(Number)
      // Build UTC range covering the full local day
      // We use a simple offset approach: get timezone offset via Intl
      const localMidnight = new Date(`${date}T00:00:00`)
      const tzOffset = new Intl.DateTimeFormat('en', { timeZone: ctx.timezone, timeZoneName: 'shortOffset' })
        .formatToParts(localMidnight)
        .find(p => p.type === 'timeZoneName')?.value ?? 'UTC+0'
      // Just use a broad UTC window (the full day ±1 extra hour)
      const dayStart = new Date(`${date}T00:00:00.000Z`)
      const dayEnd = new Date(`${date}T23:59:59.999Z`)

      const dayOfWeek = new Date(`${date}T12:00:00`).getDay()

      const slots: { starts_at: string; staff_id: string; staff_name: string }[] = []

      for (const member of staffList) {
        const { data: schedule } = await db
          .from('staff_schedules')
          .select('start_time, end_time')
          .eq('staff_id', member.id)
          .eq('day_of_week', dayOfWeek)
          .eq('is_working', true)
          .single()

        if (!schedule) continue

        const { data: existing } = await db
          .from('appointments')
          .select('starts_at, ends_at')
          .eq('staff_id', member.id)
          .eq('status', 'confirmed')
          .gte('starts_at', `${date}T00:00:00`)
          .lte('starts_at', `${date}T23:59:59`)

        const { data: blocks } = await db
          .from('time_blocks')
          .select('starts_at, ends_at')
          .eq('organization_id', ctx.organizationId)
          .lte('starts_at', `${date}T23:59:59`)
          .gte('ends_at', `${date}T00:00:00`)

        const [startH, startM] = schedule.start_time.split(':').map(Number)
        const [endH, endM] = schedule.end_time.split(':').map(Number)

        const workStart = new Date(`${date}T${schedule.start_time}:00`)
        const workEnd = new Date(`${date}T${schedule.end_time}:00`)

        let cursor = new Date(workStart)
        while (cursor < workEnd) {
          const slotEnd = new Date(cursor.getTime() + duration * 60000)
          if (slotEnd > workEnd) break

          const isPast = cursor < new Date()
          const isBooked = (existing ?? []).some(a => {
            const aStart = new Date(a.starts_at)
            const aEnd = new Date(a.ends_at)
            return cursor < aEnd && slotEnd > aStart
          })
          const isBlocked = (blocks ?? []).some(b => {
            const bStart = new Date(b.starts_at)
            const bEnd = new Date(b.ends_at)
            return cursor < bEnd && slotEnd > bStart
          })

          if (!isPast && !isBooked && !isBlocked) {
            slots.push({ starts_at: cursor.toISOString(), staff_id: member.id, staff_name: member.name })
          }

          cursor = new Date(cursor.getTime() + 30 * 60000)
        }

        if (slots.length >= 10) break
      }

      return JSON.stringify({ slots: slots.slice(0, 10), date, duration_minutes: duration })
    }

    case 'create_appointment': {
      const { customer_name, customer_phone, service_id, staff_id, starts_at } = input
      const { data: service } = await db.from('services').select('duration_minutes').eq('id', service_id).single()
      if (!service) return JSON.stringify({ error: 'Servicio no encontrado' })

      const endsAt = new Date(new Date(starts_at).getTime() + service.duration_minutes * 60000).toISOString()

      const { data: customer } = await db
        .from('customers')
        .upsert({ organization_id: ctx.organizationId, phone: customer_phone, name: customer_name }, { onConflict: 'organization_id,phone' })
        .select('id')
        .single()

      if (!customer) return JSON.stringify({ error: 'Error al registrar cliente' })

      const { data: conflict } = await db
        .from('appointments')
        .select('id')
        .eq('staff_id', staff_id)
        .eq('status', 'confirmed')
        .lt('starts_at', endsAt)
        .gt('ends_at', starts_at)
        .maybeSingle()

      if (conflict) return JSON.stringify({ error: 'El horario ya no está disponible. Por favor elige otro.' })

      const { data: appointment, error } = await db
        .from('appointments')
        .insert({
          organization_id: ctx.organizationId,
          branch_id: ctx.branchId,
          customer_id: customer.id,
          staff_id,
          service_id,
          starts_at,
          ends_at: endsAt,
          status: 'confirmed',
        })
        .select('id')
        .single()

      if (error) return JSON.stringify({ error: error.message })

      await db.from('audit_logs').insert({
        organization_id: ctx.organizationId,
        actor_type: 'bot',
        action: 'appointment.created',
        resource_type: 'appointment',
        resource_id: appointment.id,
        metadata: { customer_phone, customer_name },
      })

      return JSON.stringify({ success: true, appointment_id: appointment.id, starts_at, ends_at: endsAt })
    }

    case 'get_customer_appointments': {
      const { customer_phone } = input
      const { data: customer } = await db
        .from('customers')
        .select('id')
        .eq('organization_id', ctx.organizationId)
        .eq('phone', customer_phone)
        .single()

      if (!customer) return JSON.stringify({ appointments: [] })

      const { data: appointments } = await db
        .from('appointments')
        .select('id, starts_at, ends_at, status, service:services(name), staff:staff(name)')
        .eq('customer_id', customer.id)
        .eq('status', 'confirmed')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')

      return JSON.stringify({ appointments })
    }

    case 'cancel_appointment': {
      const { appointment_id, reason } = input
      const { error } = await db
        .from('appointments')
        .update({ status: 'cancelled', cancelled_by: 'customer', cancellation_reason: reason ?? null })
        .eq('id', appointment_id)
        .eq('organization_id', ctx.organizationId)

      if (error) return JSON.stringify({ error: error.message })

      await db.from('audit_logs').insert({
        organization_id: ctx.organizationId,
        actor_type: 'bot',
        action: 'appointment.cancelled',
        resource_type: 'appointment',
        resource_id: appointment_id,
        metadata: { reason },
      })

      return JSON.stringify({ success: true })
    }

    case 'reschedule_appointment': {
      const { appointment_id, new_starts_at, new_staff_id } = input
      const { data: appt } = await db
        .from('appointments')
        .select('service_id, staff_id')
        .eq('id', appointment_id)
        .single()

      if (!appt) return JSON.stringify({ error: 'Cita no encontrada' })

      const { data: service } = await db.from('services').select('duration_minutes').eq('id', appt.service_id).single()
      if (!service) return JSON.stringify({ error: 'Servicio no encontrado' })

      const staffId = new_staff_id ?? appt.staff_id
      const newEndsAt = new Date(new Date(new_starts_at).getTime() + service.duration_minutes * 60000).toISOString()

      const { data: conflict } = await db
        .from('appointments')
        .select('id')
        .eq('staff_id', staffId)
        .eq('status', 'confirmed')
        .neq('id', appointment_id)
        .lt('starts_at', newEndsAt)
        .gt('ends_at', new_starts_at)
        .maybeSingle()

      if (conflict) return JSON.stringify({ error: 'El nuevo horario ya no está disponible.' })

      const { error } = await db
        .from('appointments')
        .update({ starts_at: new_starts_at, ends_at: newEndsAt, staff_id: staffId })
        .eq('id', appointment_id)

      if (error) return JSON.stringify({ error: error.message })

      await db.from('audit_logs').insert({
        organization_id: ctx.organizationId,
        actor_type: 'bot',
        action: 'appointment.rescheduled',
        resource_type: 'appointment',
        resource_id: appointment_id,
        metadata: { new_starts_at },
      })

      return JSON.stringify({ success: true, new_starts_at, new_ends_at: newEndsAt })
    }

    default:
      return JSON.stringify({ error: `Tool desconocida: ${name}` })
  }
}

// ── main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // UltraMsg sends POST with JSON
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  // UltraMsg webhook payload
  const data = body.data as Record<string, unknown> | undefined
  if (!data) return new Response('ok', { status: 200 })

  const from = data.from as string | undefined
  const messageBody = data.body as string | undefined
  const type = data.type as string | undefined

  // Only handle text messages, ignore status updates / sent by us
  if (type !== 'chat' || !from || !messageBody) return new Response('ok', { status: 200 })
  // Skip messages from ourselves (UltraMsg sends these too)
  if (from === 'status@broadcast') return new Response('ok', { status: 200 })

  // Normalize phone: strip @c.us suffix
  const phone = from.replace('@c.us', '')

  // ── Look up organization ──
  // One Edge Function deployment = one UltraMsg instance = one org.
  // We identify the org via ULTRAMSG_INSTANCE env var which holds the phone number
  // registered during onboarding (e.g. "573122265985").
  const orgPhone = Deno.env.get('ORG_WHATSAPP_NUMBER')

  let orgQuery = supabase
    .from('organizations')
    .select('id, name, timezone, welcome_message, away_message, subscription_status')
    .eq('is_active', true)
    .neq('subscription_status', 'suspended')

  if (orgPhone) {
    orgQuery = orgQuery.eq('whatsapp_number', orgPhone)
  }

  const { data: org } = await orgQuery.limit(1).single()

  if (!org) {
    console.error('No organization found for phone:', orgPhone)
    return new Response('ok', { status: 200 })
  }

  if (org.subscription_status === 'suspended') {
    return new Response('ok', { status: 200 })
  }

  // ── Get or create branch ──
  const { data: branch } = await supabase
    .from('branches')
    .select('id')
    .eq('organization_id', org.id)
    .single()

  if (!branch) {
    console.error('No branch found for org:', org.id)
    return new Response('ok', { status: 200 })
  }

  // ── Get or create conversation ──
  let { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('organization_id', org.id)
    .eq('whatsapp_phone', phone)
    .single()

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ organization_id: org.id, customer_id: null, whatsapp_phone: phone, status: 'active' })
      .select('id')
      .single()
    conversation = newConv
  }

  if (!conversation) {
    console.error('Could not get/create conversation')
    return new Response('ok', { status: 200 })
  }

  // ── Save incoming message ──
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    organization_id: org.id,
    role: 'user',
    content: messageBody,
  })

  // ── Load conversation history (last 20 messages) ──
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })
    .limit(20)

  const messages: Anthropic.MessageParam[] = (history ?? []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // ── Agentic loop ──
  const ctx = { organizationId: org.id, branchId: branch.id, timezone: org.timezone ?? 'America/Mexico_City' }
  const systemPrompt = buildSystemPrompt(org)

  let currentMessages = [...messages]
  let finalText = ''
  let iterations = 0
  const MAX_ITER = 8

  while (iterations < MAX_ITER) {
    iterations++

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: currentMessages,
    })

    // Add assistant turn to messages
    currentMessages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      // Extract text response
      const textBlock = response.content.find(b => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        finalText = textBlock.text
      }
      break
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const result = await executeTool(block.name, block.input as Record<string, string>, ctx)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
      }

      currentMessages.push({ role: 'user', content: toolResults })
      continue
    }

    // Unexpected stop reason
    break
  }

  if (!finalText) {
    finalText = 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.'
  }

  // ── Save assistant message ──
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    organization_id: org.id,
    role: 'assistant',
    content: finalText,
  })

  // ── Send WhatsApp reply ──
  await sendWhatsApp(phone, finalText)

  return new Response('ok', { status: 200 })
})
