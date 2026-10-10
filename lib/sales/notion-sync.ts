import { createServiceClient } from '@/lib/supabase/service'
import { phoneKey } from '@/lib/sales/phone'

// Devuelve al CRM de Notion el avance de cada prospecto (estado, último contacto, intentos, qué respondieron).
// Empareja por teléfono (últimos 10 dígitos). Requiere que la integración tenga permiso de edición.
const DATA_SOURCE = process.env.NOTION_CRM_DATA_SOURCE_ID ?? '930127a3-2444-4688-9b4e-3fc2e88855c3'

const STATE: Record<string, { estado: string; accion: string }> = {
  new: { estado: 'Por contactar', accion: 'Mensaje de presentación' },
  contacted: { estado: 'Contactado', accion: 'Seguimiento' },
  replied: { estado: 'Respondió', accion: 'Responder duda' },
  interested: { estado: 'Interesado', accion: 'Enviar link de registro' },
  negotiating: { estado: 'Interesado', accion: 'Responder duda' },
  handoff: { estado: 'Interesado', accion: 'Llamar' },
  won: { estado: 'Cliente', accion: 'Ninguna' },
  lost: { estado: 'Sin respuesta', accion: 'Ninguna' },
  opted_out: { estado: 'No interesa', accion: 'Ninguna' },
  invalid: { estado: 'No interesa', accion: 'Ninguna' },
}

function headers() {
  const token = process.env.NOTION_TOKEN
  if (!token) throw new Error('Falta NOTION_TOKEN en Vercel')
  return { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' }
}

async function notionPagesByPhone(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  let cursor: string | undefined
  do {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE}/query`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    })
    if (!res.ok) throw new Error(`Notion respondió ${res.status}`)
    const data = await res.json() as { results: { id: string; properties: Record<string, { phone_number?: string | null }> }[]; has_more: boolean; next_cursor?: string }
    for (const r of data.results) {
      const phone = r.properties['Teléfono']?.phone_number
      if (phone) map.set(phoneKey(phone), r.id)
    }
    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)
  return map
}

export async function syncProspectsToNotion(): Promise<{ updated: number; missing: number; failed: number }> {
  if (!process.env.NOTION_TOKEN) return { updated: 0, missing: 0, failed: 0 }
  const db = createServiceClient()
  const [pages, { data: prospects }] = await Promise.all([
    notionPagesByPhone(),
    db.from('prospects').select('id, phone_key, status, followups_sent, last_contact_at, handoff_reason').neq('status', 'new'),
  ])
  let updated = 0, missing = 0, failed = 0
  for (const p of prospects ?? []) {
    const pageId = pages.get(p.phone_key)
    if (!pageId) { missing++; continue }
    const { data: last } = await db.from('prospect_messages').select('content').eq('prospect_id', p.id).eq('role', 'user').order('created_at', { ascending: false }).limit(1)
    const s = STATE[p.status] ?? STATE.contacted
    const reply = (last?.[0]?.content as string | undefined)?.slice(0, 1900)
    const props: Record<string, unknown> = {
      Estado: { select: { name: s.estado } },
      'Próxima acción': { select: { name: s.accion } },
      Intentos: { number: 1 + (p.followups_sent ?? 0) },
      Canal: { multi_select: [{ name: 'WhatsApp' }] },
    }
    if (p.last_contact_at) props['Último contacto'] = { date: { start: String(p.last_contact_at).slice(0, 10) } }
    if (reply) props['Qué respondieron'] = { rich_text: [{ text: { content: reply } }] }
    if (p.handoff_reason) props['Notas'] = { rich_text: [{ text: { content: `Requiere atención: ${p.handoff_reason}`.slice(0, 1900) } }] }
    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ properties: props }) })
    if (res.ok) updated++; else { failed++; console.error('[notion-sync]', res.status, await res.text().catch(() => '')) }
  }
  return { updated, missing, failed }
}
