import { createServiceClient } from '@/lib/supabase/service'
import { SESSION_RE } from './steps'

/**
 * Registra un paso del embudo desde el servidor (negocio creado, pago, suscripción…). Nunca rompe el flujo del usuario.
 * Si no llega la sesión del navegador, la recupera del paso "org_created" de ese negocio, para que el embudo siga unido.
 */
export async function recordFunnel(step: string, opts: { session?: string | null; orgId?: string | null; segment?: string | null }) {
  try {
    const db = createServiceClient()
    let session = opts.session && SESSION_RE.test(opts.session) ? opts.session : null
    if (!session && opts.orgId) {
      const { data } = await db.from('funnel_events').select('session_id').eq('organization_id', opts.orgId).eq('step', 'org_created').limit(1).maybeSingle()
      session = data?.session_id ?? null
    }
    if (!session) session = opts.orgId ? `org${opts.orgId.replace(/-/g, '').slice(0, 30)}` : null
    if (!session) return
    let segment = opts.segment ?? null
    if (!segment && opts.orgId) {
      const { data } = await db.from('organizations').select('business_type').eq('id', opts.orgId).maybeSingle()
      segment = data?.business_type ?? null
    }
    await db.from('funnel_events').upsert({ session_id: session, step, segment, organization_id: opts.orgId ?? null }, { onConflict: 'session_id,step', ignoreDuplicates: true })
  } catch (err) {
    console.error('[funnel] no se pudo registrar', step, err)
  }
}
