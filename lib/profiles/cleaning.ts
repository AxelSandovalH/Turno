import { SprayCan } from 'lucide-react'
import type { BusinessProfile } from './types'

export const cleaning: BusinessProfile = {
  type: 'cleaning',
  displayName: 'Limpieza de propiedades',
  emoji: '🧹',
  staffLabel: { singular: 'Personal de limpieza', plural: 'Personal de limpieza' },
  customerLabel: { singular: 'Anfitrión', plural: 'Anfitriones' },
  staffIcon: SprayCan,
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits', 'properties']),
  modules: [
    { id: 'appointments',  href: '/appointments',  title: 'Reservas' },
    { id: 'week',          href: '/semana',        title: 'Semana por persona' },
    { id: 'properties',    href: '/propiedades',   title: 'Propiedades' },
    { id: 'patients',      href: '/patients',      title: null },
    { id: 'staff',         href: '/staff',         title: null },
    { id: 'services',      href: '/services',      title: 'Servicios' },
    { id: 'schedule',      href: '/schedule',      title: 'Horarios' },
    { id: 'bot',           href: '/probar-bot',    title: 'Probar el bot' },
    { id: 'conversations', href: '/conversations', title: 'Conversaciones' },
    { id: 'whatsapp',      href: '/whatsapp',      title: 'WhatsApp' },
    { id: 'settings',      href: '/settings',      title: 'Configuración' },
  ],
}
