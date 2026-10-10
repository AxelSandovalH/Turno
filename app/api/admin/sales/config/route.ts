import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { normalizeMxPhone } from '@/lib/sales/phone'

const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

// Configuración del agente de ventas. El token de la línea nunca se devuelve ni se escribe a mano:
// se copia de un negocio que ya tiene esa instancia.
export async function POST(req: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json().catch(() => null)
  if (!b) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })
  const db = createServiceClient()

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    daily_limit: int(b.daily_limit, 1, 50, 15),
    send_start_hour: int(b.send_start_hour, 6, 20, 9),
    send_end_hour: int(b.send_end_hour, 7, 22, 18),
    max_followups: int(b.max_followups, 0, 3, 2),
    followup_after_days: int(b.followup_after_days, 1, 14, 3),
  }
  if ((patch.send_end_hour as number) <= (patch.send_start_hour as number)) {
    return NextResponse.json({ error: 'La hora de fin debe ser mayor que la de inicio' }, { status: 400 })
  }
  if (b.owner_phone !== undefined) {
    const phone = b.owner_phone ? normalizeMxPhone(String(b.owner_phone)) : null
    if (b.owner_phone && !phone) return NextResponse.json({ error: 'Tu teléfono de aviso no es válido (10 dígitos)' }, { status: 400 })
    patch.owner_phone = phone
  }
  if (b.copyFromOrgSlug) {
    const { data: org } = await db.from('organizations').select('ultramsg_instance, ultramsg_token').eq('slug', String(b.copyFromOrgSlug)).maybeSingle()
    if (!org?.ultramsg_instance || !org?.ultramsg_token) return NextResponse.json({ error: 'Ese negocio no tiene una instancia de WhatsApp' }, { status: 400 })
    patch.ultramsg_instance = org.ultramsg_instance
    patch.ultramsg_token = org.ultramsg_token
  }
  if (b.enabled !== undefined) {
    if (b.enabled) {
      const { data: cur } = await db.from('sales_config').select('ultramsg_instance, ultramsg_token, owner_phone').eq('id', 1).single()
      const instance = (patch.ultramsg_instance ?? cur?.ultramsg_instance) as string | null
      const token = (patch.ultramsg_token ?? cur?.ultramsg_token) as string | null
      const owner = (patch.owner_phone ?? cur?.owner_phone) as string | null
      if (!instance || !token) return NextResponse.json({ error: 'Primero elige la línea de WhatsApp desde la que escribirá' }, { status: 400 })
      if (!owner) return NextResponse.json({ error: 'Escribe tu teléfono: ahí te avisa cuando un prospecto necesita a una persona' }, { status: 400 })
    }
    patch.enabled = !!b.enabled
  }
  const { error } = await db.from('sales_config').update(patch).eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
