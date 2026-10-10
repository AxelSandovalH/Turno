import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { getSetupProgress } from '@/lib/setup/progress'
import { SetupChat } from './setup-chat'

export const metadata = { title: 'Asistente de configuración' }

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user?.user_metadata?.organization_id
  if (!user || !orgId) redirect('/login')

  const db = createServiceClient()
  const [{ data: org }, progress] = await Promise.all([
    db.from('organizations').select('name, slug, business_type').eq('id', orgId).single(),
    getSetupProgress(db, orgId),
  ])
  if (!org) redirect('/login')
  const drafts = progress.steps.find(st => st.id === 'services' && /borrador/.test(st.detail)) ? 1 : 0

  return <SetupChat orgName={org.name} slug={org.slug} usesAgenda={hasCapability(org.business_type, 'appointments')} drafts={drafts} steps={progress.steps} />
}
