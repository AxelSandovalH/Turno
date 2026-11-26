import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgent } from '@/lib/agent/agent'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const organizationId = user.user_metadata?.organization_id
  if (!organizationId) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  const { message } = await req.json()
  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
  }

  // Synthetic phone per staff user — isolates each tester's conversation from
  // real WhatsApp threads (unique per organization_id+whatsapp_phone) and
  // keeps it identifiable if it ever shows up in /conversations or /patients.
  let testPhone = `web-test-${user.id.slice(0, 8)}`

  // Limpieza de propiedades: se prueba como un anfitrión registrado, para que el bot ya conozca sus propiedades
  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('business_type').eq('id', organizationId).single()
  if (hasCapability(org?.business_type, 'properties')) {
    const { data: host } = await db.from('customers').select('phone').eq('organization_id', organizationId).not('booking_token', 'is', null).order('name').limit(1).maybeSingle()
    if (host) testPhone = host.phone
  }

  try {
    const reply = await runAgent({
      organizationId,
      customerPhone: testPhone,
      incomingMessage: message.trim(),
    })
    return NextResponse.json({ reply })
  } catch (error) {
    console.error('[agent/test-chat]', error)
    return NextResponse.json({ error: 'El agente no pudo responder. Intenta de nuevo.' }, { status: 500 })
  }
}
