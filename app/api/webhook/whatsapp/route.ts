import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { runAgent } from '@/lib/agent/agent'
import { sendMessage } from '@/lib/ultramsg'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  console.log('[webhook] raw body:', JSON.stringify(body))

  if (!body) return NextResponse.json({ ok: false }, { status: 400 })

  const { data } = body
  console.log('[webhook] data:', JSON.stringify(data))
  console.log('[webhook] type:', data?.type, '| fromMe:', data?.fromMe, '| body:', data?.body)

  // Only process incoming text messages
  if (!data || data.type !== 'chat' || !data.body || data.fromMe) {
    console.log('[webhook] skipped — not a chat message')
    return NextResponse.json({ ok: true })
  }

  const from: string = data.from
  const text: string = data.body
  const msgId: string = data.id
  const phone = from.replace('@c.us', '')

  console.log('[webhook] from:', from, '| phone:', phone, '| msgId:', msgId)

  const db = createServiceClient()

  // Dedup
  const { data: existing } = await db
    .from('messages')
    .select('id')
    .eq('ultramsg_id', msgId)
    .maybeSingle()

  if (existing) {
    console.log('[webhook] duplicate message, skipping')
    return NextResponse.json({ ok: true })
  }

  // Find tenant — try multiple number formats
  const candidates = [
    phone,
    phone.replace(/^521/, '52'),
    phone.replace(/^52/, '521'),
    phone.replace(/^1/, ''),
  ]
  console.log('[webhook] looking up org for candidates:', candidates)

  let organization = null
  for (const candidate of candidates) {
    const { data: found } = await db
      .from('organizations')
      .select('id, subscription_status, whatsapp_number')
      .eq('whatsapp_number', candidate)
      .maybeSingle()
    if (found) { organization = found; break }
  }

  console.log('[webhook] organization found:', JSON.stringify(organization))

  if (!organization) {
    console.log('[webhook] no org found for phone:', phone)
    return NextResponse.json({ ok: true })
  }

  if (organization.subscription_status === 'suspended' || organization.subscription_status === 'canceled') {
    return NextResponse.json({ ok: true })
  }

  // Send "typing" acknowledgement immediately so user knows bot is working
  await sendMessage(from, '...')

  // Run the agent
  const reply = await runAgent({
    organizationId: organization.id,
    customerPhone: phone,
    incomingMessage: text,
  })

  // Mark incoming message with ultramsg_id for dedup (agent saves it, update ultramsg_id)
  await db
    .from('messages')
    .update({ ultramsg_id: msgId })
    .eq('organization_id', organization.id)
    .eq('role', 'user')
    .eq('content', text)
    .is('ultramsg_id', null)
    .order('created_at', { ascending: false })
    .limit(1)

  // Send reply
  await sendMessage(from, reply)

  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
export const maxDuration = 30
