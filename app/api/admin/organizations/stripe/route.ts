import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { createServiceClient } from '@/lib/supabase/service'
import { encryptSecret, secretsConfigured } from '@/lib/secrets'

// Conecta (o quita) la cuenta de Stripe propia de un negocio. Las llaves se validan contra Stripe, se guardan
// cifradas y NUNCA se devuelven al navegador.
export async function POST(req: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const id = typeof b?.id === 'string' ? b.id : ''
  if (!id) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })
  const db = createServiceClient()

  const { data: org } = await db.from('organizations').select('id').eq('id', id).maybeSingle()
  if (!org) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  if (b?.remove === true) {
    await db.from('org_stripe_accounts').delete().eq('organization_id', id)
    return NextResponse.json({ ok: true })
  }

  if (!secretsConfigured()) {
    return NextResponse.json({ error: 'Falta la variable ORG_SECRETS_KEY en Vercel. Créala (por ejemplo con: openssl rand -hex 32), vuelve a desplegar y reintenta.' }, { status: 503 })
  }
  const secretKey = typeof b?.secretKey === 'string' ? b.secretKey.trim() : ''
  const webhookSecret = typeof b?.webhookSecret === 'string' ? b.webhookSecret.trim() : ''
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(secretKey)) return NextResponse.json({ error: 'La llave secreta debe empezar con sk_live_, sk_test_ o rk_' }, { status: 400 })
  if (!/^whsec_[A-Za-z0-9]+$/.test(webhookSecret)) return NextResponse.json({ error: 'El secreto del webhook debe empezar con whsec_' }, { status: 400 })

  // Prueba la llave con una consulta que no mueve dinero
  try {
    await new Stripe(secretKey).balance.retrieve()
  } catch {
    return NextResponse.json({ error: 'Stripe no aceptó esa llave. Revisa que sea la correcta y que esté activa.' }, { status: 400 })
  }

  const { error } = await db.from('org_stripe_accounts').upsert({
    organization_id: id,
    secret_key_enc: encryptSecret(secretKey),
    webhook_secret_enc: encryptSecret(webhookSecret),
    livemode: secretKey.includes('_live_'),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' })
  if (error) return NextResponse.json({ error: 'No se pudo guardar. ¿Corriste la migración 042?' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
