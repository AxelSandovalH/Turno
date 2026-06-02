'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Users, Scissors, Clock, Settings, LogOut, FolderHeart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { Organization } from '@/types/database'

export function AppSidebar({ organization }: { organization: Organization }) {
  const isMedical = organization.business_type && organization.business_type !== 'barbershop'
  const navItems = [
    { href: '/appointments', label: 'Citas', icon: CalendarDays },
    { href: '/patients', label: isMedical ? 'Pacientes' : 'Clientes', icon: FolderHeart },
    { href: '/staff', label: isMedical ? 'Equipo' : 'Barberos', icon: Users },
    { href: '/services', label: 'Servicios', icon: Scissors },
    { href: '/schedule', label: 'Horarios', icon: Clock },
    { href: '/settings', label: 'Configuración', icon: Settings },
  ]
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sidebar>
      {/* Header — logo + negocio */}
      <SidebarHeader className="px-4 py-5 border-b border-[var(--sidebar-border)]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logotrans.png"
            alt="Turno"
            style={{ height: 28, width: 'auto', flexShrink: 0, filter: 'brightness(0) invert(1)' }}
          />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--sidebar-foreground)] truncate leading-tight">
              {organization.name}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">
              {organization.whatsapp_number}
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    render={<Link href={href} />}
                    isActive={pathname?.startsWith(href) ?? false}
                    className="text-[13px] font-medium h-9 rounded-lg"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — cerrar sesión */}
      <SidebarFooter className="px-4 py-4 border-t border-[var(--sidebar-border)]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-[13px] font-medium text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 h-9 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
