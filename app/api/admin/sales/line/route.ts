import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { getInstanceStatus, getInstanceQr, instanceAction, sendMessage } from '@/lib/ultramsg'
import { getSalesConfig, salesCreds } from '@/lib/sales/config'

// Estado de la línea de WhatsApp de ventas, con su código QR cuando hace falta vincularla.
export async function GET() {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const cfg = await getSalesConfig()
  const creds = cfg ? salesCreds(cfg) : null
  if (!creds) return NextResponse.json({ state: 'none' })
  try {
    const { state } = await getInstanceStatus(creds)
    if (state === 'qr') return NextResponse.json({ state, instance: creds.instance, qr: await getInstanceQr(creds).catch(() => null) })
    return NextResponse.json({ state, instance: creds.instance })
  } catch (err) {
    console.error('[sales] estado de la línea falló:', err)
    return NextResponse.json({ state: 'unknown', instance: creds.instance })
  }
}

export async function POST(req: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const cfg = await getSalesConfig()
  const creds = cfg ? salesCreds(cfg) : null
  if (!cfg || !creds) return NextResponse.json({ error: 'Primero elige la línea de ventas' }, { status: 409 })
  try {
    if (b?.action === 'logout' || b?.action === 'restart') {
      await instanceAction(creds, b.action)
      // Sin sesión no se puede escribir: el agente se apaga solo
      if (b.action === 'logout') await createServiceClient().from('sales_config').update({ enabled: false }).eq('id', 1)
      return NextResponse.json({ ok: true })
    }
    if (b?.action === 'test') {
      if (!cfg.owner_phone) return NextResponse.json({ error: 'Escribe primero tu teléfono de aviso' }, { status: 409 })
      const res = await sendMessage(cfg.owner_phone, 'Prueba de la línea de ventas de QuickTurno: si lees esto, el agente puede enviar mensajes.', creds)
      if ((res as { error?: unknown })?.error) return NextResponse.json({ error: 'No se pudo enviar el mensaje de prueba' }, { status: 502 })
      return NextResponse.json({ ok: true })
    }
  } catch (err) {
    console.error('[sales] acción de la línea falló:', err)
    return NextResponse.json({ error: 'No se pudo completar la acción' }, { status: 502 })
  }
  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
