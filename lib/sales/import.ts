import { createServiceClient } from '@/lib/supabase/service'
import { normalizeMxPhone, phoneKey, segmentFromText } from '@/lib/sales/phone'

export type ImportResult = { added: number; duplicated: number; invalid: string[]; error?: string }

/** Importa líneas "Negocio, Teléfono, Giro, Ciudad, Contacto" (separadas por coma, ; o tabulador). Omite teléfonos repetidos. */
export async function importProspects(text: string): Promise<ImportResult> {
  const db = createServiceClient()
  const { data: existing } = await db.from('prospects').select('phone_key')
  const known = new Set((existing ?? []).map(p => p.phone_key))

  let added = 0, duplicated = 0
  const invalid: string[] = []
  const rows: Record<string, unknown>[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cols = line.split(/\t|;|,/).map(c => c.trim())
    const [name, rawPhone, giro, city, contact] = cols
    const phone = normalizeMxPhone(rawPhone ?? '')
    if (!name || !phone) { if (!/nombre|negocio/i.test(name ?? '')) invalid.push(line.slice(0, 60)); continue }
    const key = phoneKey(phone)
    if (known.has(key)) { duplicated++; continue }
    known.add(key)
    rows.push({ name, phone, phone_key: key, segment: segmentFromText(giro ?? ''), city: city || null, contact_name: contact || null, source: 'importación' })
    added++
  }
  if (rows.length) {
    const { error } = await db.from('prospects').insert(rows)
    if (error) return { added: 0, duplicated, invalid, error: error.message }
  }
  return { added, duplicated, invalid }
}