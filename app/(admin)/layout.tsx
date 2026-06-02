import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThemeSwitch } from '@/components/ui/theme-switch'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.user_metadata?.is_platform_admin) redirect('/login')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tracking-tight">Turno</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">{user.email}</span>
          <div style={{ transform: 'scale(0.65)', transformOrigin: 'right center' }}>
            <ThemeSwitch />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
