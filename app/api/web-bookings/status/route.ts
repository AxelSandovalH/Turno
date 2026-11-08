import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const ALLOWED = ['pending', 'scheduled', 'done', 'cancelled']

export async function POST(req: Request) {
  const { organization } = await requireOrganization()
  const b = await req.json().catch(() => null)
  if (!b?.id || !ALLOWED.includes(b.status)) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  const { data } = await createServiceClient().from('web_bookings').update({ status: b.status })
    .eq('id', String(b.id)).eq('organization_id', organization.id).select('id').maybeSingle()
  if (!data) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
