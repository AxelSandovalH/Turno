import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { ServiceList } from './service-list'
import { hasCapability } from '@/lib/profiles/registry'

export default async function ServicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const organizationId = user.user_metadata?.organization_id

  const [{ data: services }, { data: org }] = await Promise.all([
    service
      .from('services')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true }),
    service.from('organizations').select('business_type').eq('id', organizationId).single(),
  ])
  const photosEnabled = hasCapability(org?.business_type, 'service-photos')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Servicios</h1>
        <p className="text-muted-foreground text-sm">Define los servicios que ofrece tu negocio</p>
      </div>
      <ServiceList services={services ?? []} organizationId={organizationId} photosEnabled={photosEnabled} />
    </div>
  )
}
