import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Organization } from '@/types/database'

export async function requireOrganization(): Promise<{ user: { id: string; user_metadata: Record<string, string> }; organization: Organization }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const organizationId = user.user_metadata?.organization_id
  if (!organizationId) redirect('/login')

  const service = createServiceClient()
  const { data: organization } = await service
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  if (!organization) redirect('/login')
  if (organization.subscription_status === 'suspended') redirect('/suspended')

  return { user: user as { id: string; user_metadata: Record<string, string> }, organization }
}
