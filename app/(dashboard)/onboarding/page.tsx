import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from './onboarding-wizard'

export default async function OnboardingPage() {
  const { organization } = await requireOrganization()
  const service = createServiceClient()

  // If already has services and schedules, skip onboarding
  const [{ count: serviceCount }, { count: scheduleCount }] = await Promise.all([
    service.from('services').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    service.from('staff_schedules').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
  ])

  if ((serviceCount ?? 0) > 0 && (scheduleCount ?? 0) > 0) {
    redirect('/appointments')
  }

  const { data: staff } = await service
    .from('staff')
    .select('id, name')
    .eq('organization_id', organization.id)
    .limit(1)

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <OnboardingWizard
        organizationId={organization.id}
        organizationName={organization.name}
        staffId={staff?.[0]?.id ?? null}
      />
    </div>
  )
}
