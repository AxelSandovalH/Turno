import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { normalizeMxPhone, phoneKey, segmentFromText } from '@/lib/sales/phone'

// Importa prospectos desde texto pegado: una línea por negocio, separada por coma, punto y coma o tabulador.
// Formato: Negocio, Teléfono, Giro, Ciudad, Contacto  (los tres últimos son opcionales)
export async function POST(req: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const text = String(b?.text ?? '')
  if (!text.trim()) return NextResponse.json({ error: 'Pega al menos un negocio' }, { status: 400 })

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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ added, duplicated, invalid })
}

// Cambios manuales de estado desde el panel (pausar, descartar, reabrir, marcar ganado).
export async function PATCH(req: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const allowed = ['new', 'lost', 'won', 'replied', 'opted_out']
  if (!b?.id || !allowed.includes(b.status)) return NextResponse.json({ error: 'Cambio no válido' }, { status: 400 })
  const db = createServiceClient()
  const { error } = await db.from('prospects').update({ status: b.status }).eq('id', b.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
