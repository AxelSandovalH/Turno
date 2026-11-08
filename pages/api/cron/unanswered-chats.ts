import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'

// Corre cada 10 min — avisa al responsable cuando un cliente escribió hace más de 10 min y nadie le ha contestado
// (típico: el bot está en pausa porque una persona tomó el chat, o el bot no alcanzó a responder).

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = createServiceClient()
  const now = Date.now()
  const tenMinAgo = new Date(now - 10 * 60_000).toISOString()
  const dayAgo = new Date(now - 24 * 3600_000).toISOString()

  const { data: convos, error } = await db
    .from('conversations')
    .select('id, organization_id, whatsapp_phone, unanswered_alerted_for, organization:organizations(name, whatsapp_number, ultramsg_instance, ultramsg_token, whatsapp_bot_enabled)')
    .lt('last_message_at', tenMinAgo)
    .gt('last_message_at', dayAgo)
  if (error) return res.status(500).json({ error: error.message })

  let alerted = 0
  for (const c of convos ?? []) {
    const org = (Array.isArray(c.organization) ? c.organization[0] : c.organization) as
      { name: string; whatsapp_number: string | null; ultramsg_instance: string | null; ultramsg_token: string | null; whatsapp_bot_enabled: boolean | null } | null
    if (!org?.whatsapp_number || !org.ultramsg_instance || !org.ultramsg_token || org.whatsapp_bot_enabled === false) continue

    const { data: last } = await db.from('messages').select('role, content, created_at')
      .eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!last || last.role !== 'user' || last.content.startsWith('[Interno]')) continue
    if (new Date(last.created_at).getTime() > now - 10 * 60_000) continue
    // Ya se avisó de este mismo mensaje
    if (c.unanswered_alerted_for && new Date(c.unanswered_alerted_for).getTime() >= new Date(last.created_at).getTime()) continue
    // Chats con el responsable mismo no cuentan
    if (c.whatsapp_phone.slice(-10) === org.whatsapp_number.replace(/\D/g, '').slice(-10)) continue

    const mins = Math.round((now - new Date(last.created_at).getTime()) / 60_000)
    const sent = await sendMessage(
      `${org.whatsapp_number.replace(/\D/g, '')}@c.us`,
      `⏰ *Cliente sin respuesta* (hace ${mins} min)\n📞 +${c.whatsapp_phone}\n💬 "${last.content.slice(0, 200)}"\n\nEl bot no ha contestado (puede estar en pausa porque tomaste el chat). Respóndele tú o reactiva el bot desde Conversaciones.`,
      { instance: org.ultramsg_instance, token: org.ultramsg_token },
    ).then(() => true).catch(() => false)
    if (sent) {
      await db.from('conversations').update({ unanswered_alerted_for: last.created_at }).eq('id', c.id)
      alerted++
    }
  }
  return res.status(200).json({ alerted })
}
