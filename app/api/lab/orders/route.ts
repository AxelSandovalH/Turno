import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'

function folioPrefix(orgName: string): string {
  const initials = orgName
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
  return initials.slice(0, 3) || 'LAB'
}

export async function POST(req: Request) {
  try {
    const { organization, user } = await requireOrganization()
    if (!hasCapability(organization.business_type, 'lab-orders')) {
      return NextResponse.json({ error: 'No disponible para este perfil' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { customerId, newCustomer, testIds, discount = 0, notes } = body as {
      customerId?: string
      newCustomer?: { name: string; phone: string }
      testIds?: string[]
      discount?: number
      notes?: string
    }

    if (!testIds?.length) return NextResponse.json({ error: 'Selecciona al menos un estudio' }, { status: 400 })
    if (!customerId && !newCustomer?.name?.trim()) {
      return NextResponse.json({ error: 'Selecciona o registra un paciente' }, { status: 400 })
    }

    const db = createServiceClient()

    // Resolver paciente (existente o alta rápida)
    let patientId = customerId
    if (!patientId && newCustomer) {
      const { data: created, error } = await db
        .from('customers')
        .insert({
          organization_id: organization.id,
          name: newCustomer.name.trim(),
          phone: newCustomer.phone?.trim() || 'sin-telefono',
        })
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      patientId = created.id
    }

    // Snapshot de precios desde el catálogo (solo estudios activos de esta org)
    const { data: tests } = await db
      .from('lab_tests')
      .select('id, price')
      .eq('organization_id', organization.id)
      .in('id', testIds)

    if (!tests || tests.length !== testIds.length) {
      return NextResponse.json({ error: 'Algún estudio no existe' }, { status: 400 })
    }

    const subtotal = tests.reduce((s, t) => s + Number(t.price), 0)
    const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
    const total = subtotal - disc

    // Folio atómico por org/año
    const { data: seq, error: folioErr } = await db.rpc('next_lab_folio', { p_org: organization.id })
    if (folioErr) return NextResponse.json({ error: folioErr.message }, { status: 500 })
    const folio = `${folioPrefix(organization.name)}-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`

    // Staff que registra (para created_by)
    const { data: staffRec } = await db
      .from('staff')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: order, error: orderErr } = await db
      .from('lab_orders')
      .insert({
        organization_id: organization.id,
        customer_id: patientId,
        created_by: staffRec?.id ?? null,
        folio,
        subtotal,
        discount: disc,
        total,
        notes: notes || null,
      })
      .select('id')
      .single()
    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 })

    const { error: linkErr } = await db.from('lab_order_tests').insert(
      tests.map(t => ({ order_id: order.id, test_id: t.id, price_at_order: t.price }))
    )
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

    await db.from('audit_logs').insert({
      organization_id: organization.id,
      actor_type: 'user',
      action: 'lab_order.created',
      resource_type: 'lab_order',
      resource_id: order.id,
      metadata: { folio, total },
    })

    return NextResponse.json({ id: order.id, folio })
  } catch (err) {
    console.error('[lab/orders]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
