// Lee los prospectos "Por contactar" del CRM de Notion (CRM QuickTurno — Prospectos).
// Requiere NOTION_TOKEN (integración con acceso a la base) y, opcionalmente, NOTION_CRM_DATA_SOURCE_ID.
const DATA_SOURCE = process.env.NOTION_CRM_DATA_SOURCE_ID ?? '930127a3-2444-4688-9b4e-3fc2e88855c3'

interface NotionProp { type: string; title?: { plain_text: string }[]; rich_text?: { plain_text: string }[]; phone_number?: string | null; select?: { name: string } | null }
const text = (p?: NotionProp) => ((p?.title ?? p?.rich_text) ?? []).map(t => t.plain_text).join('').trim()

export async function fetchNotionProspectLines(): Promise<{ lines: string[]; skippedNoPhone: number }> {
  const token = process.env.NOTION_TOKEN
  if (!token) throw new Error('Falta NOTION_TOKEN en Vercel')
  const lines: string[] = []
  let skippedNoPhone = 0, cursor: string | undefined
  do {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor, filter: { property: 'Estado', select: { equals: 'Por contactar' } } }),
    })
    if (!res.ok) throw new Error(`Notion respondió ${res.status}: ¿la integración tiene acceso a la base?`)
    const data = await res.json() as { results: { properties: Record<string, NotionProp> }[]; has_more: boolean; next_cursor?: string }
    for (const r of data.results) {
      const p = r.properties
      const phone = p['Teléfono']?.phone_number ?? ''
      const name = text(p['Negocio'])
      if (!name) continue
      if (!phone) { skippedNoPhone++; continue }
      const clean = (v: string) => v.replace(/[,;\t\r\n]+/g, ' ')
      lines.push([name, phone, p['Giro']?.select?.name ?? '', p['Ciudad']?.select?.name ?? '', text(p['Contacto'])].map(clean).join(', '))
    }
    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)
  return { lines, skippedNoPhone }
}
