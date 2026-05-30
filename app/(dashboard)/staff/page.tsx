import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { StaffList } from './staff-list'

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const organizationId = user.user_metadata?.organization_id

  const { data: staff } = await service
    .from('staff')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Barberos</h1>
        <p className="text-muted-foreground text-sm">Gestiona el equipo de tu negocio</p>
      </div>
      <StaffList staff={staff ?? []} organizationId={organizationId} />
    </div>
  )
}
