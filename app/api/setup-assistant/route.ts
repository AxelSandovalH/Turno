import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { runSetupAssistant, type SetupMessage } from '@/lib/setup/assistant'

export const maxDuration = 60
const PER_ORG_PER_DAY = 150

// Asistente que ayuda al dueño a configurar su negocio. El negocio sale de su sesión, nunca del cuerpo de la petición.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user?.user_metadata?.organization_id as string | undefined
  if (!user || !orgId) return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'El asistente no está disponible por ahora.' }, { status: 503 })

  const body = await req.json().catch(() => null)
  const history: SetupMessage[] = (Array.isArray(body?.messages) ? body.messages : []).slice(-30)
    .filter((m: unknown): m is SetupMessage => !!m && typeof m === 'object' && ['user', 'assistant'].includes((m as SetupMessage).role) && typeof (m as SetupMessage).content === 'string')
    .map((m: SetupMessage) => ({ role: m.role, content: m.content.slice(0, 2000) }))
  while (history.length && history[0].role !== 'user') history.shift()
  if (!history.length || history[history.length - 1].role !== 'user') return NextResponse.json({ error: 'Mensaje no válido.' }, { status: 400 })

  // Tope diario por negocio (cuida el gasto); reutiliza la tabla de límites de la demo
  const db = createServiceClient()
  const key = `setup:${orgId}`, day = new Date().toISOString().slice(0, 10)
  const { data: row, error: qErr } = await db.from('demo_generations').select('count').eq('ip_hash', key).eq('day', day).maybeSingle()
  if (qErr) return NextResponse.json({ error: 'El asistente no está disponible por ahora.' }, { status: 503 })
  const used = row?.count ?? 0
  if (used >= PER_ORG_PER_DAY) return NextResponse.json({ error: 'Llegaste al límite de mensajes de hoy. Mañana seguimos.' }, { status: 429 })
  await db.from('demo_generations').upsert({ ip_hash: key, day, count: used + 1 }, { onConflict: 'ip_hash,day' })

  try {
    return NextResponse.json(await runSetupAssistant(orgId, history))
  } catch (err) {
    console.error('[setup] falló:', err)
    return NextResponse.json({ error: 'No pude responder. Intenta de nuevo en un momento.' }, { status: 502 })
  }
}
