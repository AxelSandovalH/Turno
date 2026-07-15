import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage, type UltramsgCreds } from '@/lib/ultramsg'
import { createDepositCheckoutSession } from '@/lib/stripe'
import { addMinutes, parseISO, formatISO, startOfDay, endOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'

const DEPOSIT_TIMEOUT_MINUTES = 20

interface Context {
  organizationId: string
  organizationName: string
  branchId: string
  timezone: string
  ownerWhatsapp: string
  ultramsg?: UltramsgCreds
  deposit?: { enabled: boolean; amount: number }
}

export async function handleTool(toolName: string, input: Record<string, string>, ctx: Context): Promise<string> {
  const db = createServiceClient()

  switch (toolName) {
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

      // Get staff to check
      let staffList: { id: string; name: string }[] = []
      if (staff_id) {
        const { data } = await db.from('staff').select('id, name').eq('id', staff_id).single()
        if (data) staffList = [data]
      } else {
        const { data } = await db.from('staff').select('id, name').eq('organization_id', ctx.organizationId).eq('is_active', true)
        staffList = data ?? []
      }

      // Build day start/end in UTC from local date
      const localStart = fromZonedTime(`${date}T00:00:00`, ctx.timezone)
      const localEnd = fromZonedTime(`${date}T23:59:59`, ctx.timezone)
      const dayOfWeek = toZonedTime(localStart, ctx.timezone).getDay()

      const slots: { starts_at: string; label: string; staff_id: string; staff_name: string }[] = []

      for (const staff of staffList) {
        // Get schedule for this day
        const { data: schedule } = await db
          .from('staff_schedules')
          .select('start_time, end_time')
          .eq('staff_id', staff.id)
          .eq('day_of_week', dayOfWeek)
          .eq('is_working', true)
          .single()

        if (!schedule) continue

        // Get existing appointments
        const { data: existing } = await db
          .from('appointments')
          .select('starts_at, ends_at')
          .eq('staff_id', staff.id)
          .eq('status', 'confirmed')
          .gte('starts_at', localStart.toISOString())
          .lte('starts_at', localEnd.toISOString())

        // Get time blocks
        const { data: blocks } = await db
          .from('time_blocks')
          .select('starts_at, ends_at')
          .eq('organization_id', ctx.organizationId)
          .or(`staff_id.eq.${staff.id},staff_id.is.null`)
          .lte('starts_at', localEnd.toISOString())
          .gte('ends_at', localStart.toISOString())

        // Generate slots every 30 minutes within working hours
        // Postgres time comes as "09:00:00" — normalize to HH:mm or fromZonedTime gets "T09:00:00:00" (Invalid Date)
        const workStart = fromZonedTime(`${date}T${schedule.start_time.slice(0, 5)}:00`, ctx.timezone)
        const workEnd = fromZonedTime(`${date}T${schedule.end_time.slice(0, 5)}:00`, ctx.timezone)

        let cursor = workStart
        while (cursor < workEnd) {
          const slotEnd = addMinutes(cursor, duration)
          if (slotEnd > workEnd) break

          const isBooked = (existing ?? []).some(a => {
            const aStart = parseISO(a.starts_at)
            const aEnd = parseISO(a.ends_at)
            return cursor < aEnd && slotEnd > aStart
          })

          const isBlocked = (blocks ?? []).some(b => {
            const bStart = parseISO(b.starts_at)
            const bEnd = parseISO(b.ends_at)
            return cursor < bEnd && slotEnd > bStart
          })

          const isPast = cursor < new Date()

          if (!isBooked && !isBlocked && !isPast) {
            slots.push({
              starts_at: formatISO(cursor),
              // Hora local del negocio ya formateada — el modelo la muestra tal
              // cual, sin hacer conversiones de zona horaria por su cuenta
              label: format(toZonedTime(cursor, ctx.timezone), 'h:mm a', { timeZone: ctx.timezone }),
              staff_id: staff.id,
              staff_name: staff.name,
            })
          }

          cursor = addMinutes(cursor, 30)
        }
      }

      // Mezcla los slots de todo el staff por hora (antes se llenaba el cupo
      // con el primer staff alfabético y nunca se ofrecía al resto)
      slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at))

      // Sin preferencia de staff: un solo slot por horario (evita listar la
      // misma hora tres veces con distinta persona)
      const deduped = staff_id
        ? slots
        : slots.filter((s, i) => i === 0 || s.starts_at !== slots[i - 1].starts_at)

      return JSON.stringify({
        slots: deduped.slice(0, 10),
        date,
        duration_minutes: duration,
        timezone_note: 'Los campos "label" ya están en la hora local del negocio. Muéstralos tal cual.',
      })
    }

    case 'create_appointment': {
      const { customer_name, customer_phone, service_id, staff_id, starts_at } = input

      const { data: service } = await db.from('services').select('duration_minutes').eq('id', service_id).single()
      if (!service) return JSON.stringify({ error: 'Servicio no encontrado' })

      const endsAt = formatISO(addMinutes(parseISO(starts_at), service.duration_minutes))

      // Upsert customer
      const { data: customer } = await db
        .from('customers')
        .upsert({ organization_id: ctx.organizationId, phone: customer_phone, name: customer_name }, { onConflict: 'organization_id,phone' })
        .select('id')
        .single()

      if (!customer) return JSON.stringify({ error: 'Error al registrar cliente' })

      // Double-check slot is still free
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

      // Audit log
      await db.from('audit_logs').insert({
        organization_id: ctx.organizationId,
        actor_type: 'bot',
        action: 'appointment.created',
        resource_type: 'appointment',
        resource_id: appointment.id,
        metadata: { customer_phone, customer_name },
      })

      const { data: svc } = await db.from('services').select('name').eq('id', service_id).single()
      const { data: stf } = await db.from('staff').select('name').eq('id', staff_id).single()
      const localTime = format(toZonedTime(parseISO(starts_at), ctx.timezone), "dd/MM/yyyy 'a las' HH:mm", { timeZone: ctx.timezone })

      // Deposit flow: appointment already blocks the slot; generate a Stripe
      // checkout link and let the cron release it if unpaid within the timeout.
      let depositResult: { deposit_checkout_url: string; deposit_amount: number; deposit_expires_minutes: number } | null = null

      if (ctx.deposit?.enabled && ctx.deposit.amount > 0) {
        try {
          const { url, sessionId } = await createDepositCheckoutSession({
            organizationId: ctx.organizationId,
            appointmentId: appointment.id,
            amountPesos: ctx.deposit.amount,
            businessName: ctx.organizationName,
            serviceName: svc?.name ?? 'tu cita',
          })
          const expiresAt = new Date(Date.now() + DEPOSIT_TIMEOUT_MINUTES * 60000).toISOString()

          await db.from('appointments').update({
            deposit_status: 'pending',
            deposit_amount: ctx.deposit.amount,
            stripe_checkout_session_id: sessionId,
            deposit_checkout_url: url,
            deposit_expires_at: expiresAt,
          }).eq('id', appointment.id)

          depositResult = { deposit_checkout_url: url, deposit_amount: ctx.deposit.amount, deposit_expires_minutes: DEPOSIT_TIMEOUT_MINUTES }
        } catch (err) {
          console.error('[create_appointment] deposit checkout failed:', err)
          // Sin link de pago la cita sigue existiendo — mejor confirmarla sin anticipo que perderla
        }
      }

      // Notify owner via WhatsApp (non-blocking)
      if (ctx.ownerWhatsapp) {
        const ownerTo = `${ctx.ownerWhatsapp}@c.us`
        const statusLine = depositResult ? '⏳ Esperando anticipo del cliente' : ''
        const msg = `📅 *Nueva cita agendada*\n👤 ${customer_name} (${customer_phone})\n💆 ${svc?.name ?? 'Servicio'} con ${stf?.name ?? 'Staff'}\n🕐 ${localTime}${statusLine ? `\n${statusLine}` : ''}`
        sendMessage(ownerTo, msg, ctx.ultramsg).catch(() => {})
      }

      return JSON.stringify({ success: true, appointment_id: appointment.id, starts_at, ends_at: endsAt, ...depositResult })
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

      const { data: appt } = await db
        .from('appointments')
        .select('starts_at, customer:customers(name, phone), service:services(name), staff:staff(name)')
        .eq('id', appointment_id)
        .eq('organization_id', ctx.organizationId)
        .single()

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

      // Notify owner via WhatsApp (non-blocking)
      if (ctx.ownerWhatsapp && appt) {
        const c = appt.customer as unknown as { name: string | null; phone: string } | null
        const s = appt.service as unknown as { name: string } | null
        const st = appt.staff as unknown as { name: string } | null
        const localTime = format(toZonedTime(parseISO(appt.starts_at), ctx.timezone), "dd/MM/yyyy 'a las' HH:mm", { timeZone: ctx.timezone })
        const msg = `❌ *Cita cancelada por el cliente*\n👤 ${c?.name ?? c?.phone ?? 'Cliente'}\n💆 ${s?.name ?? 'Servicio'}${st?.name ? ` con ${st.name}` : ''}\n🕐 ${localTime}${reason ? `\n📝 Motivo: ${reason}` : ''}\nEl horario quedó libre.`
        sendMessage(`${ctx.ownerWhatsapp}@c.us`, msg, ctx.ultramsg).catch(() => {})
      }

      return JSON.stringify({ success: true })
    }

    case 'reschedule_appointment': {
      const { appointment_id, new_starts_at, new_staff_id } = input

      const { data: appt } = await db
        .from('appointments')
        .select('service_id, staff_id, starts_at, customer:customers(name, phone), service:services(name)')
        .eq('id', appointment_id)
        .single()

      if (!appt) return JSON.stringify({ error: 'Cita no encontrada' })

      const { data: service } = await db.from('services').select('duration_minutes').eq('id', appt.service_id).single()
      if (!service) return JSON.stringify({ error: 'Servicio no encontrado' })

      const staffId = new_staff_id ?? appt.staff_id
      const newEndsAt = formatISO(addMinutes(parseISO(new_starts_at), service.duration_minutes))

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

      // Notify owner via WhatsApp (non-blocking)
      if (ctx.ownerWhatsapp) {
        const c = appt.customer as unknown as { name: string | null; phone: string } | null
        const s = appt.service as unknown as { name: string } | null
        const fmt = (iso: string) => format(toZonedTime(parseISO(iso), ctx.timezone), "dd/MM 'a las' HH:mm", { timeZone: ctx.timezone })
        const msg = `🔄 *Cita reagendada por el cliente*\n👤 ${c?.name ?? c?.phone ?? 'Cliente'}\n💆 ${s?.name ?? 'Servicio'}\n🕐 ${fmt(appt.starts_at)} → *${fmt(new_starts_at)}*`
        sendMessage(`${ctx.ownerWhatsapp}@c.us`, msg, ctx.ultramsg).catch(() => {})
      }

      return JSON.stringify({ success: true, new_starts_at, new_ends_at: newEndsAt })
    }

    default:
      return JSON.stringify({ error: `Tool desconocida: ${toolName}` })
  }
}
