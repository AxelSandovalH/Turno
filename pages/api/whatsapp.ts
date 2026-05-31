import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { runAgent } from '@/lib/agent/agent'
import { sendMessage } from '@/lib/ultramsg'

export const maxDuration = 60

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'turno-whatsapp-webhook' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body
  const msg = body?.data
  console.log('[whatsapp] incoming:', JSON.stringify(msg))

  if (!msg || msg.type !== 'chat' || msg.fromMe) {
    return res.status(200).json({ ok: true })
  }

  const from: string = msg.from ?? ''
  const text: string = msg.body?.trim() ?? ''
  const msgId: string = msg.id ?? ''

  if (!from || !text) return res.status(200).json({ ok: true })

  const phone = from.replace('@c.us', '').replace(/\D/g, '')
  console.log('[whatsapp] phone:', phone, 'text:', text)

  const db = createServiceClient()

  // Dedup
  const { data: existing } = await db
    .from('messages')
    .select('id')
    .eq('ultramsg_id', msgId)
    .maybeSingle()

  if (existing) return res.status(200).json({ ok: true })

  // Find tenant
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

  console.log('[whatsapp] org:', JSON.stringify(organization))

  if (!organization) return res.status(200).json({ ok: true })
  if (['suspended', 'canceled'].includes(organization.subscription_status)) {
    return res.status(200).json({ ok: true })
  }

  const reply = await runAgent({
    organizationId: organization.id,
    customerPhone: phone,
    incomingMessage: text,
  })

  await sendMessage(from, reply)
  return res.status(200).json({ ok: true })
}
