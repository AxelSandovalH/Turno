import { createServiceClient } from '@/lib/supabase/service'
import { requestPaymentLink, autoSendEnabled, waId } from '@/lib/payment-links'
import { quoteRancho, type RanchoInput } from '@/lib/rancho'
import { createOwnerConsult } from '@/lib/owner-consults'
import { stripeFor, hasOrgStripe } from '@/lib/org-stripe'
import { staffCanDo, filterStaffForService, serviceWindow, clampToWindow } from '@/lib/staff-services'
import { sendMessage, sendImage, type UltramsgCreds } from '@/lib/ultramsg'
import { createDepositCheckoutSession } from '@/lib/stripe'
import { addMinutes, parseISO, formatISO, startOfDay, endOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import { createOrder, findByName, norm, money, type OrderLineInput } from '@/lib/orders'

const DEPOSIT_TIMEOUT_MINUTES = 20
const MAX_MENU_PHOTOS = 6

interface Context {
  organizationId: string
  organizationName: string
  branchId: string | null
  timezone: string
  ownerWhatsapp: string
  ultramsg?: UltramsgCreds
  deposit?: { enabled: boolean; amount: number }
  customerPhone?: string
  currency?: string
  conversationId?: string
  /** Foto que el cliente mandó en este mensaje (se le reenvía al responsable si se le pasa el caso) */
  imageUrl?: string
  /** Citas con pago por adelantado aprobado por el responsable (farmacia) */
  prepay?: boolean
  cardFeePct?: number
}

export async function handleTool(toolName: string, input: Record<string, string>, ctx: Context): Promise<string> {
  const db = createServiceClient()

  switch (toolName) {
    case 'get_menu': {
      const [{ data: org }, { data: categories }, { data: items }] = await Promise.all([
        db.from('organizations').select('order_accepting, order_delivery_enabled, order_pickup_enabled, order_delivery_fee, order_min_amount, currency, catalog_enabled').eq('id', ctx.organizationId).single(),
        db.from('menu_categories').select('id, name').eq('organization_id', ctx.organizationId).order('sort_order').order('created_at'),
        db.from('menu_items').select('id, category_id, name, description, price, extras, is_available, requires_prescription, controlled').eq('organization_id', ctx.organizationId).order('sort_order').order('created_at'),
      ])
      if (org?.catalog_enabled === false) return JSON.stringify({ catalog_enabled: false, note: 'El catálogo en línea está apagado por ahora: no ofrezcas ni tomes pedidos de productos y no des precios. Dile al cliente con amabilidad que por el momento no puedes tomar pedidos de productos por aquí y que consultarás con el equipo; si necesita algo, consulta con handoff_to_owner si está disponible.' })
      return JSON.stringify({
        currency: (org?.currency ?? 'mxn').toUpperCase(),
        accepting_orders: org?.order_accepting ?? true,
        delivery: { enabled: org?.order_delivery_enabled ?? true, fee: Number(org?.order_delivery_fee) || 0 },
        pickup_enabled: org?.order_pickup_enabled ?? true,
        min_order: Number(org?.order_min_amount) || 0,
        categories: (categories ?? []).map(c => ({
          name: c.name,
          items: (items ?? []).filter(i => i.category_id === c.id).map(i => ({ id: i.id, name: i.name, description: i.description, price: (i.controlled || i.requires_prescription) ? null : Number(i.price), extras: i.extras, available: i.is_available, requires_prescription: !!i.requires_prescription, controlled: !!i.controlled })),
        })),
        uncategorized: (items ?? []).filter(i => !i.category_id).map(i => ({ id: i.id, name: i.name, description: i.description, price: (i.controlled || i.requires_prescription) ? null : Number(i.price), extras: i.extras, available: i.is_available, requires_prescription: !!i.requires_prescription, controlled: !!i.controlled })),
      })
    }

    case 'send_menu_photos': {
      const raw = input as unknown as { category?: string; names?: string[] }
      const { data: cat } = await db.from('organizations').select('catalog_enabled').eq('id', ctx.organizationId).single()
      if (cat?.catalog_enabled === false) return JSON.stringify({ error: 'El catálogo en línea está apagado por ahora: no envíes fotos de productos.' })
      const [{ data: categories }, { data: items }] = await Promise.all([
        db.from('menu_categories').select('id, name').eq('organization_id', ctx.organizationId),
        db.from('menu_items').select('id, category_id, name, description, price, image_url, is_available').eq('organization_id', ctx.organizationId).eq('controlled', false).eq('requires_prescription', false).order('sort_order').order('created_at'),
      ])
      const menu = items ?? []

      // Platillos pedidos por nombre, o toda una categoría
      let picked: typeof menu = []
      if (Array.isArray(raw.names) && raw.names.length) {
        for (const nm of raw.names) {
          const found = findByName(menu, nm)
          if (found && !picked.includes(found)) picked.push(found)
        }
      } else if (raw.category) {
        const cat = (categories ?? []).find(c => norm(c.name) === norm(raw.category!)) ?? (categories ?? []).find(c => norm(c.name).includes(norm(raw.category!)) || norm(raw.category!).includes(norm(c.name)))
        if (cat) picked = menu.filter(i => i.category_id === cat.id)
      }
      picked = picked.filter(i => i.is_available)

      const withPhoto = picked.filter(i => i.image_url).slice(0, MAX_MENU_PHOTOS)
      const withoutPhoto = picked.filter(i => !i.image_url).map(i => i.name)
      if (!ctx.customerPhone) return JSON.stringify({ error: 'No hay teléfono del cliente' })

      // Se envían en orden y se esperan: Vercel no debe cortar la función a medias
      let sent = 0
      for (const it of withPhoto) {
        const caption = `${it.name} - ${money(Number(it.price), ctx.currency)}${it.description ? `\n${it.description}` : ''}`
        try {
          const res = await sendImage(ctx.customerPhone, it.image_url!, caption, ctx.ultramsg)
          if (res && !res.error) sent++
          else console.error('[agent] sendImage falló:', JSON.stringify(res).slice(0, 200))
        } catch (err) {
          console.error('[agent] sendImage ERROR:', err)
        }
      }
      return JSON.stringify({
        photos_sent: sent,
        names_sent: withPhoto.map(i => i.name),
        no_photo: withoutPhoto,
        truncated: picked.filter(i => i.image_url).length > MAX_MENU_PHOTOS,
      })
    }

    case 'create_concierge_order': {
      const raw = input as unknown as { customer_name?: string; fulfillment?: string; address?: string; notes?: string; items?: OrderLineInput[] }
      const result = await createOrder({
        organizationId: ctx.organizationId,
        customerName: String(raw.customer_name ?? ''),
        customerPhone: ctx.customerPhone ?? '',
        fulfillment: raw.fulfillment === 'pickup' ? 'pickup' : 'delivery',
        address: raw.address,
        notes: raw.notes,
        source: 'whatsapp',
        items: Array.isArray(raw.items) ? raw.items : [],
        concierge: true,
      })
      if (!result.ok) return JSON.stringify({ error: result.error })
      return JSON.stringify({ success: true, order_number: result.order.order_number, status: 'solicitud_con_concierge', note: 'La solicitud quedó registrada y el concierge ya fue avisado. NO está confirmada ni cobrada: el concierge confirmará con el cliente disponibilidad, precio, lo que haga falta y el pago. Díselo abiertamente, con calidez y sin dar precios ni prometer tiempos; no menciones receta ni prescripción salvo que ya la hubieras ofrecido.' })
    }

    case 'create_order': {
      const raw = input as unknown as {
        customer_name?: string; fulfillment?: string; address?: string; notes?: string; items?: OrderLineInput[]; payment_method?: string
      }
      const cash = raw.payment_method === 'cash'
      // Con Stripe propio, el link de tarjeta se genera solo cuando el responsable lo aprueba
      const needsApproval = !cash && await hasOrgStripe(ctx.organizationId)
      const result = await createOrder({
        organizationId: ctx.organizationId,
        customerName: String(raw.customer_name ?? ''),
        customerPhone: ctx.customerPhone ?? '',
        fulfillment: raw.fulfillment === 'pickup' ? 'pickup' : 'delivery',
        address: raw.address,
        notes: raw.notes,
        source: 'whatsapp',
        items: Array.isArray(raw.items) ? raw.items : [],
        payment: cash ? 'cash' : 'card',
        deferCheckout: needsApproval,
      })
      if (!result.ok) return JSON.stringify({ error: result.error })
      const cardFee = Math.round((result.order.total - result.order.subtotal - result.order.delivery_fee) * 100) / 100
      if (cash) {
        return JSON.stringify({ success: true, order_number: result.order.order_number, subtotal: result.order.subtotal, delivery_fee: result.order.delivery_fee, total: result.order.total, payment: 'cash', note: 'Pedido registrado y avisado al equipo. Se paga en efectivo al recibir.' })
      }
      if (needsApproval) {
        const { data: o } = await db.from('organizations').select('id, name, whatsapp_number, currency').eq('id', ctx.organizationId).single()
        const lines = (Array.isArray(raw.items) ? raw.items : []).map(i => `${i.quantity} x ${i.name ?? i.menu_item_id}`).join(', ')
        const auto = await autoSendEnabled(ctx.organizationId)
        const asked = o ? await requestPaymentLink(
          { id: o.id, name: o.name, whatsapp_number: o.whatsapp_number, currency: o.currency, creds: ctx.ultramsg ?? {} as UltramsgCreds },
          { auto, customerPhone: ctx.customerPhone ?? '', customerName: String(raw.customer_name ?? ''), amount: result.order.total, description: `Pedido #${result.order.order_number}: ${lines}${raw.fulfillment === 'pickup' ? ' (recoger)' : ` (a domicilio: ${String(raw.address ?? '').slice(0, 80)})`}${cardFee > 0 ? ` | incluye cargo por tarjeta ${cardFee}` : ''}`, orderId: result.order.id }
        ) : { ok: false as const, error: 'Negocio no encontrado' }
        if (!asked.ok) {
          await db.from('orders').update({ status: 'cancelled' }).eq('id', result.order.id)
          return JSON.stringify({ error: asked.error })
        }
        if (asked.sent) {
          return JSON.stringify({ success: true, order_number: result.order.order_number, subtotal: result.order.subtotal, delivery_fee: result.order.delivery_fee, card_fee: cardFee, total: result.order.total, payment: 'link_enviado', note: 'El link de pago YA se envió al cliente por este chat (mensaje aparte, no lo repitas ni lo inventes). Dile el total (con el cargo de tarjeta si aplica) y que lo pague con ese link; el pedido se prepara al recibir el pago. Si prefiere efectivo, dile que puede cambiarlo y se registra un pedido nuevo.' })
        }
        return JSON.stringify({ success: true, order_number: result.order.order_number, subtotal: result.order.subtotal, delivery_fee: result.order.delivery_fee, card_fee: cardFee, total: result.order.total, payment: 'card_pendiente_de_aprobacion', note: 'El link de pago NO se ha enviado: ya se le consultó al responsable. Dile al cliente el total (con el cargo de tarjeta si aplica) y que en cuanto lo autoricen le llega el link por este chat. Si prefiere efectivo, dile que puede cambiarlo y se registra un pedido nuevo.' })
      }
      return JSON.stringify({
        success: true,
        order_number: result.order.order_number,
        subtotal: result.order.subtotal,
        delivery_fee: result.order.delivery_fee,
        card_fee: cardFee,
        total: result.order.total,
        payment_link: result.checkoutUrl,
      })
    }

    case 'get_order_status': {
      const phone = (ctx.customerPhone ?? '').replace(/\D/g, '')
      const { data: orders } = await db
        .from('orders')
        .select('order_number, status, fulfillment, total, created_at, payment_method, payment_status')
        .eq('organization_id', ctx.organizationId)
        .eq('customer_phone', phone)
        .or('payment_method.neq.card,payment_status.neq.unpaid')
        .order('created_at', { ascending: false })
        .limit(3)
      return JSON.stringify({ orders: orders ?? [] })
    }

    case 'get_business_info': {
      const [{ data: services }, { data: staff }] = await Promise.all([
        db.from('services').select('id, name, duration_minutes, price').eq('organization_id', ctx.organizationId).eq('is_active', true),
        db.from('staff').select('id, name').eq('organization_id', ctx.organizationId).eq('is_active', true),
      ])
      // Profesionales con servicios limitados: se informa cuáles hace cada uno (sin lista = hace todos)
      const { data: links } = await db.from('staff_services').select('staff_id, service_id').in('staff_id', (staff ?? []).map(s => s.id))
      const nameOf = new Map((services ?? []).map(s => [s.id, s.name]))
      const staffOut = (staff ?? []).map(s => {
        const mine = (links ?? []).filter(l => l.staff_id === s.id).map(l => nameOf.get(l.service_id)).filter(Boolean)
        return mine.length ? { ...s, only_services: mine } : { ...s, only_services: 'todos' }
      })
      return JSON.stringify({ currency: (ctx.currency ?? 'mxn').toUpperCase(), services, staff: staffOut })
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
      staffList = await filterStaffForService(db, staffList, service_id)
      if (!staffList.length) return JSON.stringify({ slots: [], note: 'Ningún profesional disponible ofrece este servicio' })

      // Build day start/end in UTC from local date
      const localStart = fromZonedTime(`${date}T00:00:00`, ctx.timezone)
      const localEnd = fromZonedTime(`${date}T23:59:59`, ctx.timezone)
      const dayOfWeek = toZonedTime(localStart, ctx.timezone).getDay()

      const slots: { starts_at: string; label: string; staff_id: string; staff_name: string }[] = []

      for (const staff of staffList) {
        // Horario del día — puede tener varios bloques (ej. horario partido:
        // mañana y tarde), cada fila de staff_schedules es independiente
        const { data: daySchedules } = await db
          .from('staff_schedules')
          .select('start_time, end_time')
          .eq('staff_id', staff.id)
          .eq('day_of_week', dayOfWeek)
          .eq('is_working', true)

        if (!daySchedules || daySchedules.length === 0) continue

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

        // Generate slots every 30 minutes within working hours, per bloque
        // Postgres time comes as "09:00:00" — normalize to HH:mm or fromZonedTime gets "T09:00:00:00" (Invalid Date)
        const win = await serviceWindow(db, staff.id, service_id)
        for (const schedule of daySchedules) {
          const clamped = clampToWindow(schedule.start_time.slice(0, 5), schedule.end_time.slice(0, 5), win)
          if (!clamped) continue
          const workStart = fromZonedTime(`${date}T${clamped.start}:00`, ctx.timezone)
          const workEnd = fromZonedTime(`${date}T${clamped.end}:00`, ctx.timezone)

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
      }

      // Mezcla los slots de todo el staff por hora (antes se llenaba el cupo
      // con el primer staff alfabético y nunca se ofrecía al resto)
      slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at))

      // Solo horarios que SÍ se pueden hacer: se quitan los que chocan con una cita que este mismo cliente ya tiene
      // (no puede estar en dos consultas a la vez, y evita ofrecerle un horario que luego "ya no está disponible")
      if (ctx.customerPhone) {
        const { data: cust } = await db.from('customers').select('id').eq('organization_id', ctx.organizationId).eq('phone', ctx.customerPhone).maybeSingle()
        if (cust) {
          const { data: mine } = await db.from('appointments').select('starts_at, ends_at').eq('customer_id', cust.id).eq('status', 'confirmed').gte('ends_at', localStart.toISOString())
          const busy = (mine ?? []).map(a => [new Date(a.starts_at).getTime(), new Date(a.ends_at).getTime()])
          for (let i = slots.length - 1; i >= 0; i--) {
            const s0 = new Date(slots[i].starts_at).getTime(), e0 = s0 + duration * 60_000
            if (busy.some(([bs, be]) => s0 < be && e0 > bs)) slots.splice(i, 1)
          }
        }
      }

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

      const { data: service } = await db.from('services').select('duration_minutes, price').eq('id', service_id).single()
      if (!service) return JSON.stringify({ error: 'Servicio no encontrado' })

      if (!(await staffCanDo(db, staff_id, service_id))) return JSON.stringify({ error: 'Ese profesional no ofrece este servicio. Elige otro profesional.' })
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
        .limit(1)
        .maybeSingle()

      if (conflict) {
        // Si el choque es con la cita que ESTE MISMO cliente ya tiene a esa hora (p. ej. confirmó dos veces), no es un error:
        // esa cita ya quedó agendada. Evita decirle "ya no está disponible" justo después de confirmarle.
        const { data: mine } = await db.from('appointments').select('id, starts_at, ends_at, deposit_status').eq('id', conflict.id).eq('customer_id', customer.id).eq('service_id', service_id).maybeSingle()
        if (mine && new Date(mine.starts_at).getTime() === parseISO(starts_at).getTime()) {
          return JSON.stringify({ success: true, already_booked: true, appointment_id: mine.id, starts_at: mine.starts_at, ends_at: mine.ends_at, awaiting_payment: mine.deposit_status === 'pending', note: 'Esta cita YA estaba agendada para este cliente a esta hora. No es un error ni se vuelve a crear: confírmasela como ya registrada.' })
        }
        return JSON.stringify({ error: 'El horario ya no está disponible. Por favor elige otro.' })
      }

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
      const localTime = format(toZonedTime(parseISO(starts_at), ctx.timezone), "dd/MM/yyyy 'a las' h:mm a", { timeZone: ctx.timezone })

      // Deposit flow: appointment already blocks the slot; generate a Stripe
      // checkout link and let the cron release it if unpaid within the timeout.
      let depositResult: { deposit_checkout_url: string; deposit_amount: number; deposit_expires_minutes: number } | null = null

      // Pago por adelantado con aprobación del responsable: el horario queda apartado, el responsable aprueba por WhatsApp
      // y el sistema le manda el link de Stripe al cliente; la cita queda confirmada cuando se paga
      const price = Number(service.price) || 0
      if (ctx.prepay && price > 0 && !(ctx.deposit?.enabled && ctx.deposit.amount > 0)) {
        const fee = Math.round(price * (ctx.cardFeePct ?? 0)) / 100
        const total = Math.round((price + fee) * 100) / 100
        await db.from('appointments').update({ deposit_status: 'pending', deposit_amount: total, deposit_expires_at: new Date(Date.now() + 60 * 60_000).toISOString() }).eq('id', appointment.id)
        const { data: o } = await db.from('organizations').select('id, name, whatsapp_number, currency').eq('id', ctx.organizationId).single()
        const auto = await autoSendEnabled(ctx.organizationId)
        const asked = o ? await requestPaymentLink(
          { id: o.id, name: o.name, whatsapp_number: o.whatsapp_number, currency: o.currency, creds: ctx.ultramsg ?? {} as UltramsgCreds },
          { auto, customerPhone: customer_phone, customerName: customer_name, amount: total, description: `Cita: ${svc?.name ?? 'servicio'} con ${stf?.name ?? 'profesional'}, ${localTime}${fee > 0 ? ` | incluye cargo por tarjeta ${fee}` : ''}`, appointmentId: appointment.id }
        ) : { ok: false as const, error: 'Negocio no encontrado' }
        if (!asked.ok) {
          await db.from('appointments').update({ status: 'cancelled', deposit_status: null }).eq('id', appointment.id)
          return JSON.stringify({ error: `No se pudo apartar la cita: ${asked.error}. Dile al cliente que lo confirmas con el equipo.` })
        }
        if (asked.sent) {
          return JSON.stringify({ success: true, appointment_id: appointment.id, starts_at, ends_at: endsAt, awaiting_payment: true, price, card_fee: fee, total, note: 'El horario quedó APARTADO y el link de pago YA se envió al cliente por este chat (mensaje aparte; no lo repitas ni lo inventes). La cita NO está confirmada hasta que pague: tiene 30 minutos y se confirma sola al recibir el pago. Dile el total (con el cargo por tarjeta si hay) y que revise el link; no digas que ya está confirmada.' })
        }
        return JSON.stringify({ success: true, appointment_id: appointment.id, starts_at, ends_at: endsAt, awaiting_payment: true, price, card_fee: fee, total, note: 'El horario quedó APARTADO, pero la cita NO está confirmada hasta que se pague. Ya se le consultó al responsable; en cuanto lo autorice, el cliente recibe el link de pago por este chat y tiene 30 minutos para pagar. Díselo así, con el total (incluyendo el cargo por tarjeta si hay) y sin decir que ya está confirmada.' })
      }

      if (ctx.deposit?.enabled && ctx.deposit.amount > 0) {
        try {
          const { url, sessionId } = await createDepositCheckoutSession({
            organizationId: ctx.organizationId,
            appointmentId: appointment.id,
            amountPesos: ctx.deposit.amount,
            currency: ctx.currency,
            client: await stripeFor(ctx.organizationId),
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

      // Etiqueta en hora local del negocio y formato de 12 h — el modelo la muestra
      // tal cual (starts_at viene en UTC; no debe convertirlo por su cuenta)
      const withLabels = (appointments ?? []).map(a => ({
        ...a,
        label: format(toZonedTime(parseISO(a.starts_at), ctx.timezone), "EEEE d 'de' MMMM, h:mm a", { timeZone: ctx.timezone, locale: es }),
      }))

      return JSON.stringify({ appointments: withLabels })
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
        const localTime = format(toZonedTime(parseISO(appt.starts_at), ctx.timezone), "dd/MM/yyyy 'a las' h:mm a", { timeZone: ctx.timezone })
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
        const fmt = (iso: string) => format(toZonedTime(parseISO(iso), ctx.timezone), "dd/MM 'a las' h:mm a", { timeZone: ctx.timezone })
        const msg = `🔄 *Cita reagendada por el cliente*\n👤 ${c?.name ?? c?.phone ?? 'Cliente'}\n💆 ${s?.name ?? 'Servicio'}\n🕐 ${fmt(appt.starts_at)} → *${fmt(new_starts_at)}*`
        sendMessage(`${ctx.ownerWhatsapp}@c.us`, msg, ctx.ultramsg).catch(() => {})
      }

      return JSON.stringify({ success: true, new_starts_at, new_ends_at: newEndsAt })
    }

    case 'handoff_to_owner': {
      if (!ctx.customerPhone || !ctx.ownerWhatsapp) return JSON.stringify({ error: 'No se pudo consultar al responsable' })
      const r = await createOwnerConsult(
        { id: ctx.organizationId, name: ctx.organizationName, whatsapp_number: ctx.ownerWhatsapp, creds: ctx.ultramsg ?? {} as UltramsgCreds },
        { customerPhone: ctx.customerPhone, customerName: input.customer_name, reason: input.reason, question: input.summary, imageUrl: ctx.imageUrl }
      )
      if (!r.ok) return JSON.stringify({ error: r.error })
      if (ctx.conversationId) await db.from('conversations').update({ handoff_at: new Date().toISOString() }).eq('id', ctx.conversationId)
      return JSON.stringify({ status: 'consulta_enviada', note: 'Ya le consultaste al farmacéutico. Tú sigues siendo la voz con el cliente: dile en una o dos frases que estás confirmándolo con el farmacéutico y que le respondes por aquí en cuanto te conteste, sin prometer minutos y SIN mencionar receta ni prescripción. Cuando el farmacéutico responda, recibirás su respuesta en un mensaje interno y se la comunicas al cliente. No sugieras medicamentos, dosis ni sustitutos.' })
    }

    case 'rancho_quote':
    case 'rancho_request_deposit': {
      const q = quoteRancho({
        list: input.list === 'destination' ? 'destination' : 'general', guests: Number(input.guests), cabins: Number(input.cabins ?? 0), extra_hours: Number(input.extra_hours ?? 0),
        horses: !!input.horses, photo: (input.photo as RanchoInput['photo']) ?? 'none', dinner: !!input.dinner, open_bar: !!input.open_bar,
        crossback_chairs: !!input.crossback_chairs, staff_hours: Number(input.staff_hours ?? 0), audio: !!input.audio,
        currency: input.currency === 'USD' ? 'USD' : 'MXN',
      })
      if (!q.ok) return JSON.stringify({ error: q.error })
      const cur = q.currency
      const m = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${cur}`
      const conv = (mxn: number) => cur === 'USD' && q.fx_mxn_per_usd ? Math.round(mxn / q.fx_mxn_per_usd * 100) / 100 : mxn
      const breakdown = {
        lines: q.lines.map(l => ({ concept: l.label, amount: m(conv(l.mxn)) })),
        subtotal: m(q.subtotal), cargo_4: m(q.fee), total: m(q.total), anticipo_40: m(q.deposit), currency: cur,
        not_included_quote_separately: q.pending_quote,
      }
      if (toolName === 'rancho_quote') {
        return JSON.stringify({ success: true, ...breakdown, note: 'Es un ESTIMADO sujeto a confirmación de fecha y disponibilidad. Preséntalo con el FORMATO DE WHATSAPP del prompt, sin tablas ni markdown (renta, extras, subtotal, cargo 4 %, total y el anticipo del 40 % para apartar la fecha). Si pidió decoración o iluminación, dile que se cotiza aparte con el equipo. Si acepta, usa rancho_request_deposit.' })
      }
      if (!ctx.customerPhone) return JSON.stringify({ error: 'No se pudo identificar al cliente' })
      const { data: o } = await db.from('organizations').select('id, name, whatsapp_number, currency').eq('id', ctx.organizationId).single()
      if (!o) return JSON.stringify({ error: 'Negocio no encontrado' })
      const detail = q.lines.map(l => `${l.label}: $${conv(l.mxn).toLocaleString('en-US', { maximumFractionDigits: 2 })}`).join('; ')
      const r = await requestPaymentLink(
        { id: o.id, name: o.name, whatsapp_number: o.whatsapp_number, currency: o.currency, creds: ctx.ultramsg ?? {} as UltramsgCreds },
        { customerPhone: ctx.customerPhone, customerName: String(input.customer_name ?? ''), amount: q.deposit, currency: cur === 'USD' ? 'usd' : 'mxn', maxAmount: 150000,
          eventData: {
            client_names: [String(input.customer_name ?? '').trim() || ctx.customerPhone], event_type: String(input.event_type ?? 'Evento'), event_date: String(input.event_date ?? ''),
            guests: Math.floor(Number(input.guests)), hours: 6 + Math.min(Math.max(Math.floor(Number(input.extra_hours ?? 0)), 0), 2),
            cabins: Number(input.cabins) > 0 ? { count: Math.min(Math.floor(Number(input.cabins)), 2) } : undefined,
            horses: input.horses || (input.photo && input.photo !== 'none') ? { participations: input.horses ? 2 : undefined, photo_sessions: input.photo && input.photo !== 'none' ? 1 : undefined } : undefined,
            staff: Number(input.staff_hours) > 0 ? `1 mesero, 1 bartender y 1 capitán, ${Math.floor(Number(input.staff_hours))} horas de servicio` : undefined,
            audio_lighting: input.audio ? 'Equipo de audio (6 horas)' : undefined,
            items: [...q.lines.map(l => ({ label: l.label, amount: l.mxn })), { label: 'Cargo por servicio 4%', amount: q.fee_mxn }],
            total_mxn: q.total_mxn, deposit_mxn: Math.round(q.total_mxn * 0.4 * 100) / 100,
            deposit_note: cur === 'USD' ? `Anticipo pagado en dólares: ${m(q.deposit)} (equivalente a ${Math.round(q.total_mxn * 0.4 * 100) / 100} MXN al tipo de cambio de la cotización).` : undefined,
          },
          description: `Anticipo 40% Rancho McCoy: ${String(input.event_type ?? 'evento').slice(0, 40)}, ${String(input.event_date ?? '').slice(0, 30)}, ${Math.floor(Number(input.guests))} invitados | Total ${m(q.total)} (cargo 4% incluido, sin IVA) | ${detail}`.slice(0, 400) }
      )
      if (!r.ok) return JSON.stringify({ error: r.error })
      return JSON.stringify({ status: 'pendiente_de_aprobacion', ...breakdown, note: 'Ya se le consultó al responsable (confirma fecha y disponibilidad). El link del anticipo NO se ha enviado. Dile al cliente que estás confirmando la fecha con el equipo y que en cuanto la autoricen le llega por este chat el link del anticipo de ' + m(q.deposit) + '. No prometas tiempos ni inventes el link; la fecha no queda apartada hasta que pague el anticipo.' })
    }

    case 'request_payment_link': {
      if (!ctx.customerPhone) return JSON.stringify({ error: 'No se pudo identificar al cliente' })
      const { data: o } = await db.from('organizations').select('id, name, whatsapp_number, currency').eq('id', ctx.organizationId).single()
      if (!o) return JSON.stringify({ error: 'Negocio no encontrado' })
      const r = await requestPaymentLink(
        { id: o.id, name: o.name, whatsapp_number: o.whatsapp_number, currency: o.currency, creds: ctx.ultramsg ?? {} as UltramsgCreds },
        { customerPhone: ctx.customerPhone, customerName: input.customer_name, amount: Number(input.amount), description: input.description }
      )
      if (!r.ok) return JSON.stringify({ error: r.error })
      return JSON.stringify({ status: 'pendiente_de_aprobacion', note: 'Ya se le consultó al responsable. El link NO se ha enviado. Dile al cliente que estás confirmando el cobro con el responsable y que en cuanto lo autorice le llega el link por este chat. No prometas tiempos ni inventes el link.' })
    }

    default:
      return JSON.stringify({ error: `Tool desconocida: ${toolName}` })
  }
}
