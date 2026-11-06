import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { InscritosClient } from './inscritos-client'

export default async function InscritosPage() {
  const { organization } = await requireOrganization()
  const db = createServiceClient()
  const [{ data: events }, { data: regs }] = await Promise.all([
    db.from('events').select('id, slug, title, price, currency, capacity, event_date').eq('organization_id', organization.id).order('event_date'),
    db.from('event_registrations').select('id, event_id, full_name, email, phone, birth_date, shirt_size, emergency_name, emergency_phone, package_name, kind, donation_amount, status, amount, paid_at, created_at').eq('organization_id', organization.id).order('created_at', { ascending: false }),
  ])
  return <InscritosClient events={events ?? []} regs={regs ?? []} baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''} />
}
