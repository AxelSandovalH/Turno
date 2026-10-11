import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { SEGMENTS } from '@/lib/demo/plan'
import { CLIENT_STEPS, SESSION_RE } from '@/lib/funnel/steps'

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor|uptime/i

// Recibe los pasos que ocurren en el navegador. Solo acepta pasos del navegador (los de pago y negocio los registra
// el servidor), ignora robots y no cuenta tus propias visitas de administrador.
export async function POST(req: Request) {
  const done = () => new NextResponse(null, { status: 204 })
  if (BOT.test(req.headers.get('user-agent') ?? '')) return done()
  const b = await req.json().catch(() => null)
  const session = typeof b?.session === 'string' ? b.session : ''
  const step = typeof b?.step === 'string' ? b.step : ''
  if (!SESSION_RE.test(session) || !CLIENT_STEPS.has(step)) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })
  const segment = typeof b?.segment === 'string' && SEGMENTS.includes(b.segment as never) ? b.segment : null
  if (await isPlatformAdmin().catch(() => false)) return done()
  try {
    await createServiceClient().from('funnel_events').upsert({ session_id: session, step, segment }, { onConflict: 'session_id,step', ignoreDuplicates: true })
  } catch (err) {
    console.error('[track]', err)
  }
  return done()
}
