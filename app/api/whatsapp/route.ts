import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { runAgent } from '@/lib/agent/agent'
import { sendMessage } from '@/lib/ultramsg'

export const maxDuration = 60

export async function GET() {
  return NextResponse.json({ ok: true, service: 'turno-whatsapp-webhook' })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const msg = body?.data
  console.log('[whatsapp] incoming:', JSON.stringify(msg))

  // Ignore non-text, outgoing, or empty messages
  if (!msg || msg.type !== 'chat' || msg.fromMe) {
    return NextResponse.json({ ok: true })
  }

  const from: string = msg.from ?? ''
  const text: string = msg.body?.trim() ?? ''
  const msgId: string = msg.id ?? ''

  if (!from || !text) return NextResponse.json({ ok: true })

  const phone = from.replace('@c.us', '').replace(/\D/g, '')
  console.log('[whatsapp] phone:', phone, 'text:', text)

  const db = createServiceClient()

  // Dedup — skip if we already processed this message
  const { data: existing } = await db
    .from('messages')
    .select('id')
    .eq('ultramsg_id', msgId)
    .maybeSingle()

  if (existing) return NextResponse.json({ ok: true })

  // Find org by WhatsApp number (try common MX prefixes)
  const candidates = [phone, `52${phone.slice(-10)}`, `521${phone.slice(-10)}`]
  let organization = null
  for (const candidate of candidates) {
    const { data } = await db
      .from('organizations')
      .select('id, subscription_status')
      .eq('whatsapp_number', candidate)
      .maybeSingle()
    if (data) { organization = data; console.log('[whatsapp] org found:', candidate); break }
  }

  if (!organization) return NextResponse.json({ ok: true })
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
