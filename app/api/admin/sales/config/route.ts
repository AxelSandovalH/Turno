import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { normalizeMxPhone } from '@/lib/sales/phone'
import { reserveFreeInstance, moveInstanceFromOrg, clearLine } from '@/lib/sales/line'

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
    daily_limit: int(b.daily_limit, 1, 300, 15),
    max_followups: int(b.max_followups, 0, 3, 2),
    followup_after_days: int(b.followup_after_days, 1, 14, 3),
  }
  if (b.owner_phone !== undefined) {
    const phone = b.owner_phone ? normalizeMxPhone(String(b.owner_phone)) : null
    if (b.owner_phone && !phone) return NextResponse.json({ error: 'Tu teléfono de aviso no es válido (10 dígitos)' }, { status: 400 })
    patch.owner_phone = phone
  }
  // Línea de WhatsApp: se aparta una libre de la reserva, se mueve la de un negocio, o se quita
  if (b.clearLine) {
    await clearLine()
  } else if (b.line?.source === 'pool' && b.line.value) {
    const r = await reserveFreeInstance(String(b.line.value))
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  } else if (b.line?.source === 'org' && b.line.value) {
    const r = await moveInstanceFromOrg(String(b.line.value))
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  }

  if (b.enabled !== undefined) {
    if (b.enabled) {
      const { data: cur } = await db.from('sales_config').select('ultramsg_instance, ultramsg_token, owner_phone').eq('id', 1).single()
      const instance = cur?.ultramsg_instance as string | null
      const token = cur?.ultramsg_token as string | null
      const owner = (patch.owner_phone ?? cur?.owner_phone) as string | null
      if (!instance || !token) return NextResponse.json({ error: 'Primero elige la línea de WhatsApp desde la que escribirá' }, { status: 400 })
      if (!owner) return NextResponse.json({ error: 'Escribe tu teléfono: ahí te avisa cuando un prospecto necesita a una persona' }, { status: 400 })
    }
    patch.enabled = !!b.enabled
    // Duración del encendido en horas (1 a 168); sin valor = hasta apagarlo
    const hours = Number(b.runHours)
    patch.run_until = b.enabled && hours > 0 ? new Date(Date.now() + Math.min(hours, 168) * 3600_000).toISOString() : null
  }
  const { error } = await db.from('sales_config').update(patch).eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
