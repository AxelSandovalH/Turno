import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { sendMessage } from '@/lib/ultramsg'

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
      .select('id, folio, customer:customers(id, name, phone, portal_token)')
      .eq('id', orderId)
      .eq('organization_id', organization.id)
      .single()
    if (!order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

    const customer = order.customer as unknown as {
      id: string; name: string | null; phone: string; portal_token: string | null
    } | null
    if (!customer?.phone || customer.phone === 'sin-telefono') {
      return NextResponse.json({ error: 'El paciente no tiene teléfono registrado' }, { status: 400 })
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
    if (result?.error) {
      return NextResponse.json({ error: 'No se pudo enviar el WhatsApp (revisa la instancia de UltraMsg)' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, reportUrl })
  } catch (err) {
    console.error('[lab/send-report]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
