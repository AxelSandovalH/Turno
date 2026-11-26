import type { createServiceClient } from '@/lib/supabase/service'

/**
 * Propiedad de una reserva: la elegida (solo si es de ese anfitrión) o una nueva con el nombre que escribió.
 * Devuelve null si no se puede resolver.
 */
export async function resolveProperty(db: ReturnType<typeof createServiceClient>, a: { organizationId: string; customerId: string; propertyId?: unknown; name?: unknown; zone?: unknown }) {
  const id = typeof a.propertyId === 'string' ? a.propertyId : ''
  if (id) {
    const { data } = await db.from('properties').select('id, name, zone').eq('id', id).eq('organization_id', a.organizationId).eq('customer_id', a.customerId).eq('is_active', true).maybeSingle()
    return data
  }
  const name = String(a.name ?? '').trim().slice(0, 80)
  if (!name) return null
  const zone = String(a.zone ?? '').trim().slice(0, 60) || null
  const { data: existing } = await db.from('properties').select('id, name, zone').eq('customer_id', a.customerId).eq('organization_id', a.organizationId).eq('name', name).maybeSingle()
  if (existing) return existing
  const { data } = await db.from('properties').insert({ organization_id: a.organizationId, customer_id: a.customerId, name, zone }).select('id, name, zone').single()
  return data
}
