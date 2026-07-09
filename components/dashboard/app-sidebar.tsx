'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarDays, Clock, Settings, Tag,
  LogOut, FolderHeart, Search, ChevronRight, BarChart2, MessageCircle, DollarSign,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { staffLabel as getStaffLabel, customerLabel as getCustomerLabel, staffIcon } from '@/lib/business-type'
import type { Organization } from '@/types/database'

// ── Types ──────────────────────────────────────────────────────────────────────

type ResultType = 'module' | 'staff' | 'service' | 'patient'

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  breadcrumb: string[]   // e.g. ['Equipo', 'Carlos Reyes']
  href: string
  type: ResultType
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AppSidebar({ organization }: { organization: Organization }) {
  const staffLabel   = getStaffLabel(organization.business_type, true)
  const patientLabel = getCustomerLabel(organization.business_type, true)

  const modules: SearchResult[] = [
    { id: 'appointments', type: 'module', title: 'Citas',          subtitle: 'Agenda del día',           breadcrumb: ['Citas'],          href: '/appointments', },
    { id: 'patients',     type: 'module', title: patientLabel,     subtitle: 'Expedientes y perfiles',   breadcrumb: [patientLabel],     href: '/patients', },
    { id: 'staff',        type: 'module', title: staffLabel,        subtitle: 'Tu equipo de trabajo',     breadcrumb: [staffLabel],       href: '/staff', },
    { id: 'services',     type: 'module', title: 'Servicios',       subtitle: 'Catálogo y precios',       breadcrumb: ['Servicios'],      href: '/services', },
    { id: 'schedule',     type: 'module', title: 'Horarios',        subtitle: 'Disponibilidad y bloqueos',breadcrumb: ['Horarios'],       href: '/schedule', },
    { id: 'conversations', type: 'module', title: 'Conversaciones',   subtitle: 'Historial de WhatsApp',      breadcrumb: ['Conversaciones'], href: '/conversations', },
    { id: 'finanzas',     type: 'module', title: 'Finanzas',         subtitle: 'Ingresos, comisiones, cortes', breadcrumb: ['Finanzas'],      href: '/finanzas', },
    { id: 'analytics',    type: 'module', title: 'Analytics',        subtitle: 'Citas, ingresos, tendencias', breadcrumb: ['Analytics'],     href: '/analytics', },
    { id: 'settings',     type: 'module', title: 'Configuración',   subtitle: 'Negocio, WhatsApp, cuenta',breadcrumb: ['Configuración'],  href: '/settings', },
  ]

  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [query, setQuery]       = useState('')
  const [focused, setFocused]   = useState(false)
  const [results, setResults]   = useState<SearchResult[]>([])
  const [loading, setLoading]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 220)

  // ── Live search ─────────────────────────────────────────────────────────────
  const search = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) { setResults([]); return }

    setLoading(true)
    const orgId = organization.id
    const like  = `%${trimmed}%`

    const [staffRes, servicesRes, patientsRes] = await Promise.all([
      supabase
        .from('staff')
        .select('id, name, role')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .ilike('name', like)
        .limit(5),
      supabase
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .ilike('name', like)
        .limit(5),
      supabase
        .from('customers')
        .select('id, name, phone')
        .eq('organization_id', orgId)
        .or(`name.ilike.${like},phone.ilike.${like}`)
        .limit(5),
    ])

    const moduleMatches: SearchResult[] = modules.filter(m =>
      m.title.toLowerCase().includes(trimmed.toLowerCase()) ||
      (m.subtitle ?? '').toLowerCase().includes(trimmed.toLowerCase())
    )

    const staffResults: SearchResult[] = (staffRes.data ?? []).map(s => ({
      id:         `staff-${s.id}`,
      type:       'staff' as ResultType,
      title:      s.name,
      subtitle:   s.role === 'owner' ? 'Dueño' : s.role === 'manager' ? 'Gerente' : 'Staff',
      breadcrumb: [staffLabel, s.name],
      href:       '/staff',
    }))

    const serviceResults: SearchResult[] = (servicesRes.data ?? []).map(s => ({
      id:         `service-${s.id}`,
      type:       'service' as ResultType,
      title:      s.name,
      subtitle:   [s.duration_minutes ? `${s.duration_minutes} min` : null, s.price ? `$${s.price}` : null].filter(Boolean).join(' · ') || undefined,
      breadcrumb: ['Servicios', s.name],
      href:       '/services',
    }))

    const patientResults: SearchResult[] = (patientsRes.data ?? []).map(p => ({
      id:         `patient-${p.id}`,
      type:       'patient' as ResultType,
      title:      p.name ?? p.phone,
      subtitle:   p.name ? p.phone : undefined,
      breadcrumb: [patientLabel, p.name ?? p.phone],
      href:       `/patients/${p.id}`,
    }))

    setResults([...moduleMatches, ...staffResults, ...serviceResults, ...patientResults])
    setLoading(false)
  }, [organization.id, organization.business_type]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { search(debouncedQuery) }, [debouncedQuery, search])

  // ── Keyboard shortcut ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus() }
      if (e.key === 'Escape') { inputRef.current?.blur(); setQuery('') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Click outside to close ───────────────────────────────────────────────────
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          !inputRef.current?.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const showDrop  = focused && query.trim().length > 0
  const navItems  = query.trim() ? [] : modules // hide nav when searching

  // Group for display
  const grouped: { label: string; items: SearchResult[] }[] = []
  const moduleMatches = results.filter(r => r.type === 'module')
  const dataMatches   = results.filter(r => r.type !== 'module')

  if (moduleMatches.length) grouped.push({ label: 'Módulos', items: moduleMatches })
  if (dataMatches.length) {
    const byType: Record<string, SearchResult[]> = {}
    for (const r of dataMatches) {
      if (!byType[r.type]) byType[r.type] = []
      byType[r.type].push(r)
    }
    const typeLabel: Record<string, string> = { staff: staffLabel, service: 'Servicios', patient: patientLabel }
    for (const [type, items] of Object.entries(byType)) {
      grouped.push({ label: typeLabel[type] ?? type, items })
    }
  }

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="px-4 py-4 border-b border-[var(--sidebar-border)] space-y-3">
        <div className="flex items-center gap-3">
          <div style={{ flexShrink: 0, color: 'var(--sidebar-foreground)' }}>
            {organization.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="h-7 w-7 rounded-md object-cover"
              />
            ) : (
              <TurnoLogo height={28} />
            )}
          </div>
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
        <div className="relative">
          <div className={`flex items-center gap-2 rounded-lg border px-2.5 h-8 transition-colors ${focused ? 'border-[var(--primary)] bg-[var(--sidebar-accent)]' : 'border-[var(--sidebar-border)] bg-[var(--sidebar-accent)]'}`}>
            <Search className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              className="flex-1 bg-transparent text-[12px] text-[var(--sidebar-foreground)] placeholder:text-[var(--muted-foreground)] outline-none min-w-0"
            />
            {query ? (
              <button onClick={() => { setQuery(''); setResults([]) }} className="text-[var(--muted-foreground)] hover:text-[var(--sidebar-foreground)] text-xs">✕</button>
            ) : (
              <span className="text-[10px] text-[var(--muted-foreground)] shrink-0 hidden sm:block">⌘K</span>
            )}
          </div>

          {/* Dropdown results */}
          {showDrop && (
            <div
              ref={dropRef}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar)] shadow-xl overflow-hidden"
              style={{ maxHeight: '65vh', overflowY: 'auto' }}
            >
              {loading && (
                <p className="text-[11px] text-[var(--muted-foreground)] px-3 py-3">Buscando...</p>
              )}

              {!loading && results.length === 0 && (
                <p className="text-[11px] text-[var(--muted-foreground)] px-3 py-3">Sin resultados para "{query}"</p>
              )}

              {!loading && grouped.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest px-3 pt-3 pb-1">
                    {group.label}
                  </p>
                  {group.items.map(item => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => { setQuery(''); setResults([]); setFocused(false) }}
                      className="flex items-start gap-2.5 px-3 py-2 hover:bg-[var(--sidebar-accent)] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-1 mb-0.5">
                          {item.breadcrumb.map((crumb, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && <ChevronRight className="h-2.5 w-2.5 text-[var(--muted-foreground)] shrink-0" />}
                              <span className={`text-[10px] ${i === item.breadcrumb.length - 1 && item.breadcrumb.length > 1 ? 'text-[var(--sidebar-foreground)] font-medium' : 'text-[var(--muted-foreground)]'}`}>
                                {crumb}
                              </span>
                            </span>
                          ))}
                        </div>
                        {/* Title & subtitle */}
                        {item.breadcrumb.length === 1 && (
                          <p className="text-[13px] font-medium text-[var(--sidebar-foreground)] truncate">{item.title}</p>
                        )}
                        {item.subtitle && (
                          <p className="text-[11px] text-[var(--muted-foreground)] truncate">{item.subtitle}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Nav — se oculta mientras buscas */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {(query.trim() ? [] : modules).map(({ href, title, id }) => {
                const Icon = {
                  appointments: CalendarDays,
                  patients:     FolderHeart,
                  staff:        staffIcon(organization.business_type),
                  services:     Tag,
                  schedule:     Clock,
                  conversations: MessageCircle,
                  finanzas:     DollarSign,
                  analytics:    BarChart2,
                  settings:     Settings,
                }[id] ?? CalendarDays
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={pathname?.startsWith(href) ?? false}
                      className="text-[13px] font-medium h-9 rounded-lg"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              {query.trim().length > 0 && !showDrop && (
                <p className="text-[12px] text-[var(--muted-foreground)] px-3 py-4 text-center">
                  Sin resultados
                </p>
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
