import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addAssistant, removeAssistant } from '@/lib/billing'

// Agrega el Asistente de WhatsApp a la suscripción del negocio logueado.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user?.user_metadata?.organization_id
  if (!user || !orgId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const result = await addAssistant(orgId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true })
}

// Quita el Asistente de WhatsApp (se aplica de inmediato, con abono proporcional).
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user?.user_metadata?.organization_id
  if (!user || !orgId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const result = await removeAssistant(orgId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true })
}
