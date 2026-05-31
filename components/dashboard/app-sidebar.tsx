'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Users, Scissors, Clock, Settings, LogOut } from 'lucide-react'
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

const navItems = [
  { href: '/appointments', label: 'Citas', icon: CalendarDays },
  { href: '/staff', label: 'Barberos', icon: Users },
  { href: '/services', label: 'Servicios', icon: Scissors },
  { href: '/schedule', label: 'Horarios', icon: Clock },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

export function AppSidebar({ organization }: { organization: Organization }) {
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
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logotrans.png" alt="Turno" style={{ height: 32, width: 'auto', flexShrink: 0, filter: 'brightness(0) invert(1)' }} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#ebebeb] truncate leading-tight">{organization.name}</p>
            <p className="text-[11px] text-[#3d3d3d] truncate mt-0.5">{organization.whatsapp_number}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    render={<Link href={href} />}
                    isActive={pathname?.startsWith(href) ?? false}
                    className="text-[13px] font-medium"
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

      <SidebarFooter className="px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-[13px] font-medium text-[#3d3d3d] hover:text-[#ebebeb]"
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
