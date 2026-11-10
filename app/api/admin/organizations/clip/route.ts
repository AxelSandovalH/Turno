import { NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { createServiceClient } from '@/lib/supabase/service'
import { encryptSecret, secretsConfigured } from '@/lib/secrets'
import { clipCredentialsWork } from '@/lib/clip'

// Conecta (o quita) la cuenta de Clip propia de un negocio. Las credenciales se validan contra Clip, se guardan
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
    await db.from('org_clip_accounts').delete().eq('organization_id', id)
    return NextResponse.json({ ok: true })
  }

  if (!secretsConfigured()) {
    return NextResponse.json({ error: 'Falta la variable ORG_SECRETS_KEY en Vercel.' }, { status: 503 })
  }
  const apiKey = typeof b?.apiKey === 'string' ? b.apiKey.trim() : ''
  const apiSecret = typeof b?.apiSecret === 'string' ? b.apiSecret.trim() : ''
  if (apiKey.length < 8 || apiSecret.length < 8) return NextResponse.json({ error: 'Escribe la API Key y la Clave Secreta de Clip' }, { status: 400 })

  try {
    const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
    if (!(await clipCredentialsWork(token))) return NextResponse.json({ error: 'Clip no aceptó esas credenciales. Revisa que sean la API Key y la Clave Secreta correctas.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'No se pudo contactar a Clip para validar las credenciales' }, { status: 502 })
  }

  const { error } = await db.from('org_clip_accounts').upsert({
    organization_id: id,
    api_key_enc: encryptSecret(apiKey),
    api_secret_enc: encryptSecret(apiSecret),
    livemode: !apiKey.startsWith('test_'),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' })
  if (error) return NextResponse.json({ error: 'No se pudo guardar. ¿Corriste la migración 063?' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
