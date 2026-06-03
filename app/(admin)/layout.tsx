import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThemeSwitch } from '@/components/ui/theme-switch'
import Link from 'next/link'
import { LayoutDashboard, LogOut } from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Organizaciones', icon: LayoutDashboard },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.user_metadata?.is_platform_admin) redirect('/login')

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight">Turno</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Admin</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-2 py-3 border-t border-border space-y-1">
          <p className="px-3 text-[11px] text-muted-foreground truncate">{user.email}</p>
          <form action="/auth/signout" method="POST">
            <button type="submit" className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <div style={{ transform: 'scale(0.65)', transformOrigin: 'right center' }}>
            <ThemeSwitch />
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 px-8 py-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
