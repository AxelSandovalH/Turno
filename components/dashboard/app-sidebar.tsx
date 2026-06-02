'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarDays, Users, Scissors, Clock, Settings, LogOut, FolderHeart, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { Organization } from '@/types/database'

export function AppSidebar({ organization }: { organization: Organization }) {
  const isMedical = organization.business_type && organization.business_type !== 'barbershop'

  const allItems = [
    { href: '/appointments',        label: 'Citas',          icon: CalendarDays, keywords: ['citas', 'agenda', 'calendario', 'booking', 'hoy'] },
    { href: '/patients',            label: isMedical ? 'Pacientes' : 'Clientes', icon: FolderHeart, keywords: ['pacientes', 'clientes', 'expediente', 'historial', 'ficha'] },
    { href: '/staff',               label: isMedical ? 'Equipo' : 'Barberos',    icon: Users,        keywords: ['barberos', 'equipo', 'staff', 'empleados', 'colaboradores'] },
    { href: '/services',            label: 'Servicios',      icon: Scissors,     keywords: ['servicios', 'precios', 'tarifas', 'corte', 'tratamientos'] },
    { href: '/schedule',            label: 'Horarios',       icon: Clock,        keywords: ['horarios', 'disponibilidad', 'bloqueos', 'vacaciones', 'dias'] },
    { href: '/settings',            label: 'Configuración',  icon: Settings,     keywords: ['configuracion', 'ajustes', 'negocio', 'whatsapp', 'mensajes', 'perfil', 'cuenta'] },
  ]

  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const navItems = query.trim()
    ? allItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.keywords.some(k => k.includes(query.toLowerCase()))
      )
    : allItems

  // Cmd/Ctrl+K to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') inputRef.current?.blur()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="px-4 py-4 border-b border-[var(--sidebar-border)] space-y-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logotrans.png" alt="Turno" style={{ height: 28, width: 'auto', flexShrink: 0, filter: 'brightness(0) invert(1)' }} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--sidebar-foreground)] truncate leading-tight">
              {organization.name}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">
              {organization.whatsapp_number}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-2 rounded-lg border px-2.5 h-8 transition-colors ${focused ? 'border-[var(--primary)] bg-[var(--sidebar-accent)]' : 'border-[var(--sidebar-border)] bg-[var(--sidebar-accent)]'}`}>
          <Search className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar módulo..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="flex-1 bg-transparent text-[12px] text-[var(--sidebar-foreground)] placeholder:text-[var(--muted-foreground)] outline-none min-w-0"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="text-[var(--muted-foreground)] hover:text-[var(--sidebar-foreground)] text-xs leading-none">✕</button>
          ) : (
            <span className="text-[10px] text-[var(--muted-foreground)] shrink-0 hidden sm:block">⌘K</span>
          )}
        </div>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.length === 0 ? (
                <p className="text-[12px] text-[var(--muted-foreground)] px-3 py-4 text-center">Sin resultados</p>
              ) : (
                navItems.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} onClick={() => setQuery('')} />}
                      isActive={pathname?.startsWith(href) ?? false}
                      className="text-[13px] font-medium h-9 rounded-lg"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
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
