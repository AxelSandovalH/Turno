import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { SubscriptionGate } from '@/components/dashboard/subscription-gate'
import { TrialBanner } from '@/components/dashboard/trial-banner'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeSwitch } from '@/components/ui/theme-switch'
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

  const status = organization?.subscription_status ?? 'trialing'
  const trialEndsAt = organization?.trial_ends_at ?? null

  return (
    <SubscriptionGate status={status} trialEndsAt={trialEndsAt}>
      <SidebarProvider>
        <div className="print:hidden contents">{organization && <AppSidebar organization={organization} />}</div>
        <main className="flex-1 min-w-0 bg-background">
          <div className="print:hidden">
            <TrialBanner status={status} trialEndsAt={trialEndsAt} />
          </div>
          <div className="print:hidden flex items-center justify-between px-4 py-3 border-b border-border">
            <SidebarTrigger className="text-muted-foreground/40 hover:text-muted-foreground" />
            <div style={{ transform: 'scale(0.65)', transformOrigin: 'right center' }}>
              <ThemeSwitch />
            </div>
          </div>
          <div className="p-6 max-w-5xl">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </SubscriptionGate>
  )
}
