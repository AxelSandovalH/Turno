import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { runAgent } from '@/lib/agent/agent'
import { sendMessage } from '@/lib/ultramsg'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false }, { status: 400 })

  const { data } = body

  // Only process incoming text messages
  if (!data || data.type !== 'chat' || !data.body || data.fromMe) {
    return NextResponse.json({ ok: true })
  }

  const from: string = data.from    // e.g. "521XXXXXXXXXX@c.us"
  const text: string = data.body
  const msgId: string = data.id

  // Normalize phone — strip @c.us suffix
  const phone = from.replace('@c.us', '')

  const db = createServiceClient()

  // Dedup — ignore if we already processed this message
  const { data: existing } = await db
    .from('messages')
    .select('id')
    .eq('ultramsg_id', msgId)
    .maybeSingle()

  if (existing) return NextResponse.json({ ok: true })

  // Find tenant by WhatsApp number
  const { data: org } = await db
    .from('organizations')
    .select('id, subscription_status')
    .eq('whatsapp_number', phone.replace(/^521/, '52'))  // normalize MX numbers
    .maybeSingle()

  // Try exact match if normalize didn't work
  const organization = org ?? (await db
    .from('organizations')
    .select('id, subscription_status')
    .eq('whatsapp_number', phone)
    .maybeSingle()
  ).data

  if (!organization) {
    // No tenant found for this number — silently ignore
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
