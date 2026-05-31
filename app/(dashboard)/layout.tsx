import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { requireOrganization } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { organization } = await requireOrganization()

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
