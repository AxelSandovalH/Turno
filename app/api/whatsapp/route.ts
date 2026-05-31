import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { runAgent } from '@/lib/agent/agent'
import { sendMessage } from '@/lib/ultramsg'

export const maxDuration = 60

export async function GET() {
  return NextResponse.json({ ok: true, service: 'turno-whatsapp-webhook' })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: true })

  const msg = body.data
  console.log('[whatsapp] incoming:', JSON.stringify(msg))

  if (!msg || msg.type !== 'chat' || msg.fromMe) {
    return NextResponse.json({ ok: true })
  }

  const from: string = msg.from ?? ''
  const text: string = msg.body?.trim() ?? ''
  const msgId: string = msg.id ?? ''

  if (!from || !text) return NextResponse.json({ ok: true })

  const phone = from.replace('@c.us', '').replace(/\D/g, '')
  console.log('[whatsapp] phone:', phone, '| text:', text)

  const db = createServiceClient()

  // Dedup
  const { data: existing } = await db
    .from('messages')
    .select('id')
    .eq('ultramsg_id', msgId)
    .maybeSingle()

  if (existing) {
    console.log('[whatsapp] duplicate, skipping')
    return NextResponse.json({ ok: true })
  }

  // Find tenant — try multiple number formats
  const candidates = [phone, `52${phone.slice(-10)}`, `521${phone.slice(-10)}`]
  console.log('[whatsapp] looking for org with candidates:', candidates)

  let organization = null
  for (const candidate of candidates) {
    const { data } = await db
      .from('organizations')
      .select('id, subscription_status')
      .eq('whatsapp_number', candidate)
      .maybeSingle()
    if (data) { organization = data; console.log('[whatsapp] org found:', candidate); break }
  }

  if (!organization) {
    console.log('[whatsapp] no org found')
    return NextResponse.json({ ok: true })
  }

  if (['suspended', 'canceled'].includes(organization.subscription_status)) {
    return NextResponse.json({ ok: true })
  }

  const reply = await runAgent({
    organizationId: organization.id,
    customerPhone: phone,
    incomingMessage: text,
  })

  await sendMessage(from, reply)
  return NextResponse.json({ ok: true })
}
