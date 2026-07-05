import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { runAgent } from '@/lib/agent/agent'
import { sendMessage } from '@/lib/ultramsg'

export const maxDuration = 60

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'turno-whatsapp-webhook',
    env: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      ultramsg_instance: !!process.env.ULTRAMSG_INSTANCE,
      ultramsg_token: !!process.env.ULTRAMSG_TOKEN,
    },
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const msg = body?.data
    console.log('[whatsapp] raw body:', JSON.stringify(body).slice(0, 500))

    if (!msg || msg.type !== 'chat' || msg.fromMe) {
      console.log('[whatsapp] skipped — type:', msg?.type, 'fromMe:', msg?.fromMe)
      return NextResponse.json({ ok: true })
    }

    const from: string = msg.from ?? ''
    const text: string = msg.body?.trim() ?? ''
    const msgId: string = msg.id ?? ''

    console.log('[whatsapp] from:', from, 'text:', text, 'id:', msgId)

    if (!from || !text) return NextResponse.json({ ok: true })

    const phone = from.replace('@c.us', '').replace(/\D/g, '')
    const db = createServiceClient()

    // Dedup: ignore if we already processed this UltraMsg message ID
    if (msgId) {
      const { data: existing } = await db
        .from('messages')
        .select('id')
        .eq('ultramsg_id', msgId)
        .maybeSingle()
      if (existing) {
        console.log('[whatsapp] duplicate msgId, skipping:', msgId)
        return NextResponse.json({ ok: true })
      }
    }

    const ORG_FIELDS = 'id, subscription_status, whatsapp_number, timezone, ultramsg_instance, ultramsg_token'

    // Find org — primary route: by UltraMsg instance ID (multi-tenant)
    const instanceId: string = body?.instanceId ?? body?.instance_id ?? ''
    let organization = null

    if (instanceId) {
      const { data } = await db
        .from('organizations')
        .select(ORG_FIELDS)
        .eq('ultramsg_instance', instanceId)
        .maybeSingle()
      if (data) organization = data
      console.log('[whatsapp] org by instance', instanceId, '->', organization?.id ?? 'not found')
    }

    // Fallback: founder instance (no per-org creds configured yet) — match by sender phone
    if (!organization) {
      const candidates = [phone, `52${phone.slice(-10)}`, `521${phone.slice(-10)}`]
      for (const candidate of candidates) {
        const { data, error } = await db
          .from('organizations')
          .select(ORG_FIELDS)
          .eq('whatsapp_number', candidate)
          .maybeSingle()
        console.log('[whatsapp] org lookup', candidate, '->', data?.id ?? 'not found', error?.message ?? '')
        if (data) { organization = data; break }
      }
    }

    if (!organization) {
      console.log('[whatsapp] no org found — instanceId:', instanceId, 'phone:', phone)
      return NextResponse.json({ ok: true })
    }

    const creds = { instance: organization.ultramsg_instance, token: organization.ultramsg_token }

    if (['suspended', 'canceled'].includes(organization.subscription_status)) {
      console.log('[whatsapp] org suspended:', organization.id)
      return NextResponse.json({ ok: true })
    }

    // ── Intercept confirmation responses (SI / NO) ────────────────────────────
    const normalized = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const isYes = /^(si|sí|yes|confirmo|confirm)$/i.test(normalized)
    const isNo  = /^(no|cancel|cancelo|no\s+puedo|no\s+voy)$/i.test(normalized)

    if (isYes || isNo) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Find customer by phone
      const { data: customer } = await db
        .from('customers')
        .select('id')
        .eq('organization_id', organization.id)
        .or(`phone.eq.${phone},phone.eq.52${phone.slice(-10)},phone.eq.521${phone.slice(-10)}`)
        .maybeSingle()

      if (customer) {
        const { data: pendingAppt } = await db
          .from('appointments')
          .select('id, starts_at, service:services(name), staff:staff(name)')
          .eq('customer_id', customer.id)
          .eq('organization_id', organization.id)
          .eq('confirmation_status', 'pending')
          .gte('starts_at', new Date().toISOString())
          .lte('starts_at', tomorrow.toISOString())
          .order('starts_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (pendingAppt) {
          const svc = pendingAppt.service as { name: string } | { name: string }[] | null
          const stf = pendingAppt.staff as { name: string } | { name: string }[] | null
          const svcName = (Array.isArray(svc) ? svc[0]?.name : svc?.name) ?? 'tu servicio'
          const stfName = (Array.isArray(stf) ? stf[0]?.name : stf?.name) ?? ''
          const localTime = new Date(pendingAppt.starts_at).toLocaleString('es-MX', {
            timeZone: organization.timezone, weekday: 'long', day: 'numeric', month: 'long',
            hour: '2-digit', minute: '2-digit',
          })

          let reply: string
          if (isYes) {
            await db.from('appointments')
              .update({ confirmation_status: 'confirmed' })
              .eq('id', pendingAppt.id)
            reply = `✅ ¡Perfecto! Tu asistencia quedó confirmada. Te esperamos.`
          } else {
            // Cancel for real — frees the slot so someone else can book it
            await db.from('appointments')
              .update({
                confirmation_status: 'declined',
                status: 'cancelled',
                cancelled_by: 'customer',
                cancellation_reason: 'Declinó la confirmación por WhatsApp',
              })
              .eq('id', pendingAppt.id)

            await db.from('audit_logs').insert({
              organization_id: organization.id,
              actor_type: 'customer',
              action: 'appointment.cancelled',
              resource_type: 'appointment',
              resource_id: pendingAppt.id,
              metadata: { reason: 'declined_confirmation', phone },
            })

            // Notify owner (non-blocking)
            sendMessage(
              `${organization.whatsapp_number}@c.us`,
              `❌ *Cita cancelada por el cliente*\n👤 ${phone}\n💆 ${svcName}${stfName ? ` con ${stfName}` : ''}\n🕐 ${localTime}\nEl horario quedó libre.`,
              creds
            ).catch(() => {})

            reply = `Entendido, cancelamos tu cita de ${svcName} del ${localTime}. 😊\n\n¿Te gustaría reagendar? Dime qué día te acomoda y te paso los horarios disponibles.`
          }

          await sendMessage(from, reply, creds)

          // Save the exchange so the agent has context if the customer follows up
          // (also records ultramsg_id so the dedup check covers this path)
          const { data: conversation } = await db
            .from('conversations')
            .upsert(
              { organization_id: organization.id, whatsapp_phone: phone, status: 'active', last_message_at: new Date().toISOString() },
              { onConflict: 'organization_id,whatsapp_phone' }
            )
            .select('id')
            .single()

          if (conversation) {
            await db.from('messages').insert([
              { conversation_id: conversation.id, organization_id: organization.id, role: 'user', content: text, ultramsg_id: msgId || null },
              { conversation_id: conversation.id, organization_id: organization.id, role: 'assistant', content: reply },
            ])
          }

          return NextResponse.json({ ok: true })
        }
      }
    }

    console.log('[whatsapp] running agent for org:', organization.id)
    const reply = await runAgent({
      organizationId: organization.id,
      customerPhone: phone,
      incomingMessage: text,
      ultramsgId: msgId || undefined,
    })

    console.log('[whatsapp] agent reply:', reply.slice(0, 200))
    await sendMessage(from, reply, creds)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[whatsapp] FATAL ERROR:', err)
    return NextResponse.json({ ok: true }) // always 200 to UltraMsg
  }
}
