import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

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
      <main className="flex-1 min-w-0 bg-[#0c0c0c]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a]">
          <SidebarTrigger className="text-[#3d3d3d] hover:text-[#6b6b6b]" />
        </div>
        <div className="p-6 max-w-5xl">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
