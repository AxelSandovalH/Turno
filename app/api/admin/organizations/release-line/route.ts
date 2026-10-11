import { NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { releaseInstanceFromOrg } from '@/lib/whatsapp-connection'

// Le quita la instancia de WhatsApp a un negocio: cierra la sesión del teléfono y la devuelve a la reserva como libre.
// Si UltraMsg no logra cerrar la sesión, no se libera (así nunca queda una línea conectada y sin dueño).
export async function POST(req: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const id = typeof b?.id === 'string' ? b.id : ''
  if (!id) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })
  const ok = await releaseInstanceFromOrg(id)
  if (!ok) return NextResponse.json({ error: 'UltraMsg no pudo cerrar la sesión de esa línea. Intenta de nuevo o ciérrala desde el panel de UltraMsg.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
