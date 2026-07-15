import type { ProfileModule } from './types'

/**
 * Módulos del dashboard para perfiles basados en citas (barbería, spa,
 * consultorios). title: null = el label lo resuelve el perfil (staff/patients).
 */
export const APPOINTMENT_MODULES: readonly ProfileModule[] = [
  { id: 'appointments',  href: '/appointments',  title: 'Citas' },
  { id: 'patients',      href: '/patients',      title: null },
  { id: 'staff',         href: '/staff',         title: null },
  { id: 'services',      href: '/services',      title: 'Servicios' },
  { id: 'schedule',      href: '/schedule',      title: 'Horarios' },
  { id: 'conversations', href: '/conversations', title: 'Conversaciones' },
  { id: 'finanzas',      href: '/finanzas',      title: 'Finanzas' },
  { id: 'analytics',     href: '/analytics',     title: 'Analytics' },
  { id: 'settings',      href: '/settings',      title: 'Configuración' },
]
