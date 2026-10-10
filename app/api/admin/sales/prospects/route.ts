import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { importProspects } from '@/lib/sales/import'

// Importa prospectos desde texto pegado: una línea por negocio, separada por coma, punto y coma o tabulador.
// Formato: Negocio, Teléfono, Giro, Ciudad, Contacto  (los tres últimos son opcionales)
export async function POST(req: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const text = String(b?.text ?? '')
  if (!text.trim()) return NextResponse.json({ error: 'Pega al menos un negocio' }, { status: 400 })

  const r = await importProspects(text)
  if (r.error) return NextResponse.json({ error: r.error }, { status: 500 })
  return NextResponse.json(r)
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
