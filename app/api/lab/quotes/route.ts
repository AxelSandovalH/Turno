import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'

export async function POST(req: Request) {
  try {
    const { organization, user } = await requireOrganization()
    if (!hasCapability(organization.business_type, 'lab-orders')) {
      return NextResponse.json({ error: 'No disponible para este perfil' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { customerName, testIds, discount = 0 } = body as {
      customerName?: string
      testIds?: string[]
      discount?: number
    }

    if (!testIds?.length) return NextResponse.json({ error: 'Selecciona al menos un estudio' }, { status: 400 })

    const db = createServiceClient()

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

    // Consecutivo compartido con órdenes (misma secuencia por org/año, prefijo COT)
    const { data: seq, error: folioErr } = await db.rpc('next_lab_folio', { p_org: organization.id })
    if (folioErr) return NextResponse.json({ error: folioErr.message }, { status: 500 })
    const folio = `COT-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`

    const { data: staffRec } = await db
      .from('staff')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .maybeSingle()

    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 15)

    const { data: quote, error: quoteErr } = await db
      .from('lab_quotes')
      .insert({
        organization_id: organization.id,
        customer_name: customerName?.trim() || null,
        created_by: staffRec?.id ?? null,
        folio,
        subtotal,
        discount: disc,
        total: subtotal - disc,
        valid_until: validUntil.toISOString().slice(0, 10),
      })
      .select('id')
      .single()
    if (quoteErr) return NextResponse.json({ error: quoteErr.message }, { status: 500 })

    const { error: linkErr } = await db.from('lab_quote_tests').insert(
      tests.map(t => ({ quote_id: quote.id, test_id: t.id, price_at_quote: t.price }))
    )
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

    return NextResponse.json({ id: quote.id, folio })
  } catch (err) {
    console.error('[lab/quotes]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
