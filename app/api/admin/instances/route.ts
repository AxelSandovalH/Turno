import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstanceStatus } from '@/lib/ultramsg'
import { normalizeInstanceId } from '@/lib/whatsapp-connection'

// Agrega una instancia de UltraMsg a la reserva. Solo administradores de la plataforma.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.user_metadata?.is_platform_admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const instance = normalizeInstanceId(String(body?.instanceId ?? ''))
  const token = String(body?.token ?? '').trim()
  if (!/^instance\d+$/.test(instance) || token.length < 6) {
    return NextResponse.json({ error: 'Escribe el ID de la instancia (ej. instance123456) y su token' }, { status: 400 })
  }

  // Se comprueba contra UltraMsg que las credenciales sirvan antes de guardarlas
  try {
    await getInstanceStatus({ instance, token })
  } catch {
    return NextResponse.json({ error: 'UltraMsg no reconoció esa instancia o ese token' }, { status: 400 })
  }

  const db = createServiceClient()
  // Una instancia que ya usa un negocio no puede entrar a la reserva: se asignaría dos veces
  const digits = instance.replace(/^instance/, '')
  const { data: inUse } = await db.from('organizations').select('name').in('ultramsg_instance', [instance, digits]).maybeSingle()
  if (inUse) {
    return NextResponse.json({ error: `Esa instancia ya la usa ${inUse.name}. Agrega una instancia nueva.` }, { status: 409 })
  }

  const { error } = await db.from('whatsapp_instances').insert({ instance_id: instance, token })
  if (error) {
    const dup = error.code === '23505'
    return NextResponse.json({ error: dup ? 'Esa instancia ya está en la reserva' : error.message }, { status: dup ? 409 : 500 })
  }
  return NextResponse.json({ ok: true })
}
