import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { sendMessage } from '@/lib/ultramsg'
import { resend, FROM } from '@/lib/resend'
import { labReportEmailHtml, labReportEmailText } from '@/lib/emails/lab-report'

export async function POST(req: Request) {
  try {
    const { organization } = await requireOrganization()
    if (!hasCapability(organization.business_type, 'lab-orders')) {
      return NextResponse.json({ error: 'No disponible para este perfil' }, { status: 403 })
    }

    const { orderId } = await req.json().catch(() => ({}))
    if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 })

    const db = createServiceClient()
    const { data: order } = await db
      .from('lab_orders')
      .select('id, folio, customer:customers(id, name, phone, email, portal_token)')
      .eq('id', orderId)
      .eq('organization_id', organization.id)
      .single()
    if (!order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

    const customer = order.customer as unknown as {
      id: string; name: string | null; phone: string; email: string | null; portal_token: string | null
    } | null
    const hasPhone = !!customer?.phone && customer.phone !== 'sin-telefono'
    if (!customer || (!hasPhone && !customer.email)) {
      return NextResponse.json({ error: 'El paciente no tiene teléfono ni correo registrado' }, { status: 400 })
    }

    // Verifica que haya resultados antes de mandar el link
    const { count } = await db
      .from('lab_order_results')
      .select('id, order_test:lab_order_tests!inner(order_id)', { count: 'exact', head: true })
      .eq('order_test.order_id', order.id)
    if (!count) return NextResponse.json({ error: 'La orden aún no tiene resultados capturados' }, { status: 400 })

    // Token del portal (se genera si el paciente no tiene)
    let token = customer.portal_token
    if (!token) {
      token = randomBytes(24).toString('base64url')
      await db.from('customers').update({ portal_token: token }).eq('id', customer.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
    const reportUrl = `${baseUrl}/r/${token}/${order.id}`

    // WhatsApp (si tiene teléfono)
    let whatsappOk = false
    if (hasPhone) {
      const message = [
        `Hola ${customer.name ?? ''}`.trim() + ',',
        '',
        `Tus resultados de laboratorio (orden ${order.folio}) ya están listos. Puedes consultarlos e imprimirlos aquí:`,
        '',
        reportUrl,
        '',
        `El enlace es personal, no lo compartas. — ${organization.name}`,
      ].join('\n')
      const result = await sendMessage(customer.phone, message, {
        instance: organization.ultramsg_instance,
        token: organization.ultramsg_token,
      })
      whatsappOk = !result?.error
    }

    // Email (si tiene correo) — Resend
    let emailOk = false
    if (customer.email) {
      try {
        await resend.emails.send({
          from: FROM,
          to: customer.email,
          subject: `Tus resultados están listos — ${order.folio}`,
          html: labReportEmailHtml({
            patientName: customer.name ?? 'paciente',
            businessName: organization.name,
            folio: order.folio,
            reportUrl,
          }),
          text: labReportEmailText({
            patientName: customer.name ?? 'paciente',
            businessName: organization.name,
            folio: order.folio,
            reportUrl,
          }),
        })
        emailOk = true
      } catch (err) {
        console.error('[lab/send-report] email failed:', err)
      }
    }

    if (!whatsappOk && !emailOk) {
      return NextResponse.json({ error: 'No se pudo enviar por ningún canal (revisa UltraMsg/Resend)' }, { status: 502 })
    }

    const channels = [whatsappOk && 'WhatsApp', emailOk && 'correo'].filter(Boolean).join(' y ')
    return NextResponse.json({ ok: true, reportUrl, channels })
  } catch (err) {
    console.error('[lab/send-report]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
