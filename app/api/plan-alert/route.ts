import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Called client-side after incrementing sessions_done on a plan.
// Sends WhatsApp alert to the therapist when sessions_done = total_sessions - 2.

export async function POST(req: Request) {
  try {
    const { planId } = await req.json()
    if (!planId) return NextResponse.json({ ok: false, error: 'planId required' }, { status: 400 })

    const db = createServiceClient()

    const { data: plan } = await db
      .from('treatment_plans')
      .select('id, title, sessions_done, total_sessions, staff_id, customer:customers(name), staff:staff(name, phone)')
      .eq('id', planId)
      .single()

    if (!plan) return NextResponse.json({ ok: false, error: 'plan not found' }, { status: 404 })

    const remaining = (plan.total_sessions ?? 0) - plan.sessions_done
    if (remaining !== 2) return NextResponse.json({ ok: true, skipped: true })

    const staffPhone = (plan.staff as unknown as { phone: string | null } | null)?.phone
    const staffName  = (plan.staff as unknown as { name: string } | null)?.name ?? 'Terapeuta'
    const patientName = (plan.customer as unknown as { name: string | null } | null)?.name ?? 'el paciente'

    if (!staffPhone) return NextResponse.json({ ok: true, skipped: true, reason: 'no staff phone' })

    const instance = process.env.ULTRAMSG_INSTANCE!
    const token    = process.env.ULTRAMSG_TOKEN!

    const message = [
      `⚠️ *Alerta de plan de tratamiento*`,
      ``,
      `Hola ${staffName}, el plan *"${plan.title}"* de *${patientName}* está por concluir.`,
      ``,
      `📊 Sesiones realizadas: ${plan.sessions_done} de ${plan.total_sessions}`,
      `🔔 Solo quedan *2 sesiones* restantes.`,
      ``,
      `Considera hablar con el paciente sobre renovar el plan o dar el alta.`,
    ].join('\n')

    await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, to: staffPhone, body: message }),
    })

    return NextResponse.json({ ok: true, alerted: true })
  } catch (err) {
    console.error('[plan-alert]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
