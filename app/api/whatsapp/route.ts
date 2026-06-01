import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { runAgent } from '@/lib/agent/agent'
import { sendMessage } from '@/lib/ultramsg'

export const maxDuration = 60

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'turno-whatsapp-webhook',
    env: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      ultramsg_instance: !!process.env.ULTRAMSG_INSTANCE,
      ultramsg_token: !!process.env.ULTRAMSG_TOKEN,
    },
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const msg = body?.data
    console.log('[whatsapp] raw body:', JSON.stringify(body).slice(0, 500))

    if (!msg || msg.type !== 'chat' || msg.fromMe) {
      console.log('[whatsapp] skipped — type:', msg?.type, 'fromMe:', msg?.fromMe)
      return NextResponse.json({ ok: true })
    }

    const from: string = msg.from ?? ''
    const text: string = msg.body?.trim() ?? ''
    const msgId: string = msg.id ?? ''

    console.log('[whatsapp] from:', from, 'text:', text, 'id:', msgId)

    if (!from || !text) return NextResponse.json({ ok: true })

    const phone = from.replace('@c.us', '').replace(/\D/g, '')

    const db = createServiceClient()

    // Find org
    const candidates = [phone, `52${phone.slice(-10)}`, `521${phone.slice(-10)}`]
    let organization = null
    for (const candidate of candidates) {
      const { data, error } = await db
        .from('organizations')
        .select('id, subscription_status, whatsapp_number')
        .eq('whatsapp_number', candidate)
        .maybeSingle()
      console.log('[whatsapp] org lookup', candidate, '->', data?.id ?? 'not found', error?.message ?? '')
      if (data) { organization = data; break }
    }

    if (!organization) {
      console.log('[whatsapp] no org found for phone:', phone, '— candidates tried:', candidates)
      return NextResponse.json({ ok: true })
    }

    if (['suspended', 'canceled'].includes(organization.subscription_status)) {
      console.log('[whatsapp] org suspended:', organization.id)
      return NextResponse.json({ ok: true })
    }

    console.log('[whatsapp] running agent for org:', organization.id)
    const reply = await runAgent({
      organizationId: organization.id,
      customerPhone: phone,
      incomingMessage: text,
    })

    console.log('[whatsapp] agent reply:', reply.slice(0, 200))
    await sendMessage(from, reply)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[whatsapp] FATAL ERROR:', err)
    return NextResponse.json({ ok: true }) // always 200 to UltraMsg
  }
}
