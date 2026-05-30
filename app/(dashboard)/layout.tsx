import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = createServiceClient()
  const organizationId = user.user_metadata?.organization_id

  if (!organizationId) redirect('/login')

  const { data: organization } = await service
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  if (!organization) redirect('/login')

  if (organization.subscription_status === 'suspended') {
    redirect('/suspended')
  }

  return (
    <SidebarProvider>
      <AppSidebar organization={organization} />
      <main className="flex-1 min-w-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <SidebarTrigger />
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
