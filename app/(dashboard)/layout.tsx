import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Layout does NOT redirect — each page calls requireOrganization() individually.
// This prevents Next.js 16 from applying the redirect to Pages Router API routes.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let organization = null
  if (user?.user_metadata?.organization_id) {
    const service = createServiceClient()
    const { data } = await service
      .from('organizations')
      .select('*')
      .eq('id', user.user_metadata.organization_id)
      .single()
    organization = data
  }

  return (
    <SidebarProvider>
      {organization && <AppSidebar organization={organization} />}
      <main className="flex-1 min-w-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <SidebarTrigger />
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
