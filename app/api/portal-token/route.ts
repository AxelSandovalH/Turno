import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireOrganization } from '@/lib/auth'
import { randomBytes } from 'crypto'

export async function POST(req: Request) {
  try {
    const { organization } = await requireOrganization()
    const { patientId } = await req.json()
    if (!patientId) return NextResponse.json({ error: 'patientId required' }, { status: 400 })

    const db = createServiceClient()

    // Fetch patient (must belong to this org)
    const { data: patient } = await db
      .from('customers')
      .select('id, name, phone, portal_token')
      .eq('id', patientId)
      .eq('organization_id', organization.id)
      .single()

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    // Generate token if doesn't exist
    let token = patient.portal_token
    if (!token) {
      token = randomBytes(24).toString('base64url') // 32-char URL-safe token
      await db.from('customers').update({ portal_token: token }).eq('id', patientId)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://quickturno.app'
    const portalUrl = `${baseUrl}/p/${token}`

    // Send WhatsApp
    const instance = process.env.ULTRAMSG_INSTANCE!
    const tkn      = process.env.ULTRAMSG_TOKEN!

    const isMedical = organization.business_type && organization.business_type !== 'barbershop'
    const label = isMedical ? 'paciente' : 'cliente'

    const message = [
      `👋 Hola ${patient.name ?? label}, aquí puedes consultar tu información en *${organization.name}*:`,
      ``,
      `🔗 ${portalUrl}`,
      ``,
      `Verás tus próximas citas, el avance de tu plan y tu evolución. El link es personal, no lo compartas.`,
    ].join('\n')

    if (patient.phone) {
      await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tkn, to: patient.phone, body: message }),
      })
    }

    return NextResponse.json({ ok: true, portalUrl })
  } catch (err) {
    console.error('[portal-token]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { organization } = await requireOrganization()
    const { patientId } = await req.json()

    const db = createServiceClient()
    await db.from('customers')
      .update({ portal_token: null })
      .eq('id', patientId)
      .eq('organization_id', organization.id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
