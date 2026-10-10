import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Adónde mandar a quien ya tiene sesión y llega al registro (por ejemplo desde "Publicar mi sitio" en la demo):
 * directo al paso que le toca, sin pasar por pantallas intermedias.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ next: null })
  const orgId = user.user_metadata?.organization_id as string | undefined
  if (!orgId) return NextResponse.json({ next: null })          // sin negocio: completa los datos en el registro

  const { data: org } = await createServiceClient().from('organizations').select('subscription_status').eq('id', orgId).maybeSingle()
  const status = org?.subscription_status
  // Aún no paga: directo a elegir plan. Activo: al asistente de configuración. Otro estado: el panel muestra qué falta
  return NextResponse.json({ next: status === 'trialing' ? '/payment' : status === 'active' ? '/setup' : '/appointments' })
}
