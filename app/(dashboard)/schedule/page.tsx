import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { ScheduleManager } from './schedule-manager'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const organizationId = user.user_metadata?.organization_id

  const { data: org } = await service.from('organizations').select('business_type').eq('id', organizationId).single()
  const isMedical = org?.business_type && org.business_type !== 'barbershop'
  const staffLabel = isMedical ? 'Equipo' : 'Barberos'

  const [{ data: staff }, { data: schedules }, { data: blocks }] = await Promise.all([
    service
      .from('staff')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at'),
    service
      .from('staff_schedules')
      .select('*')
      .in(
        'staff_id',
        (await service.from('staff').select('id').eq('organization_id', organizationId)).data?.map(s => s.id) ?? []
      ),
    service
      .from('time_blocks')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('ends_at', new Date().toISOString())
      .order('starts_at'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Horarios</h1>
        <p className="text-muted-foreground text-sm">Configura la disponibilidad de tu equipo</p>
      </div>
      <ScheduleManager
        staff={staff ?? []}
        schedules={schedules ?? []}
        blocks={blocks ?? []}
        organizationId={organizationId}
        staffLabel={staffLabel}
      />
    </div>
  )
}
