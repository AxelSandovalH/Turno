import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstanceQr, getInstanceStatus, instanceAction, configureInstanceWebhook, sendMessage, type InstanceState } from '@/lib/ultramsg'
import { claimInstanceForOrg, WEBHOOK_URL } from '@/lib/whatsapp-connection'

// Conexión de WhatsApp del negocio logueado. El token de UltraMsg nunca sale del servidor.

async function loadOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user?.user_metadata?.organization_id
  if (!user || !orgId) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const db = createServiceClient()
  const { data: org } = await db
    .from('organizations')
    .select('id, name, whatsapp_number, whatsapp_bot_enabled, ultramsg_instance, ultramsg_token, whatsapp_connected_at')
    .eq('id', orgId)
    .single()
  if (!org) return { error: NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 }) }
  if (!org.whatsapp_bot_enabled) return { error: NextResponse.json({ error: 'Tu plan no incluye WhatsApp' }, { status: 403 }) }
  return { db, org }
}

type ConnState = InstanceState | 'pending'

export async function GET() {
  const ctx = await loadOrg()
  if ('error' in ctx) return ctx.error
  const { db, org } = ctx

  let creds = org.ultramsg_instance && org.ultramsg_token ? { instance: org.ultramsg_instance as string, token: org.ultramsg_token as string } : null
  // Sin instancia: se le asigna una libre de la reserva (si no hay, queda en espera)
  if (!creds) creds = await claimInstanceForOrg(org.id)
  if (!creds) return NextResponse.json({ state: 'pending' satisfies ConnState })

  try {
    const { state } = await getInstanceStatus(creds)
    if (state === 'connected') {
      if (!org.whatsapp_connected_at) {
        await db.from('organizations').update({ whatsapp_connected_at: new Date().toISOString() }).eq('id', org.id)
        // Al conectarse por primera vez se asegura el webhook (idempotente)
        await configureInstanceWebhook(creds, WEBHOOK_URL).catch(err => console.error('[whatsapp] webhook config failed:', err))
      }
      return NextResponse.json({ state })
    }
    if (state === 'qr') {
      const qr = await getInstanceQr(creds).catch(() => null)
      return NextResponse.json({ state, qr })
    }
    return NextResponse.json({ state })
  } catch (err) {
    console.error('[whatsapp] status failed:', err)
    return NextResponse.json({ state: 'unknown' satisfies ConnState })
  }
}

export async function POST(req: Request) {
  const ctx = await loadOrg()
  if ('error' in ctx) return ctx.error
  const { db, org } = ctx
  const body = await req.json().catch(() => null)
  const action = body?.action as string
  if (!org.ultramsg_instance || !org.ultramsg_token) return NextResponse.json({ error: 'Aún no tienes una línea asignada' }, { status: 409 })
  const creds = { instance: org.ultramsg_instance as string, token: org.ultramsg_token as string }

  try {
    if (action === 'disconnect') {
      await instanceAction(creds, 'logout')
      await db.from('organizations').update({ whatsapp_connected_at: null }).eq('id', org.id)
      return NextResponse.json({ ok: true })
    }
    if (action === 'restart') {
      await instanceAction(creds, 'restart')
      return NextResponse.json({ ok: true })
    }
    if (action === 'test') {
      const result = await sendMessage(
        `${org.whatsapp_number}@c.us`,
        `QuickTurno: tu WhatsApp quedó conectado. A partir de ahora el asistente de ${org.name} atiende los mensajes que lleguen a este número.`,
        creds
      )
      if (result?.error) return NextResponse.json({ error: 'No se pudo enviar el mensaje de prueba' }, { status: 502 })
      return NextResponse.json({ ok: true })
    }
  } catch (err) {
    console.error('[whatsapp] action failed:', action, err)
    return NextResponse.json({ error: 'No se pudo completar la acción. Intenta de nuevo.' }, { status: 502 })
  }
  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
