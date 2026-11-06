import { Flag } from 'lucide-react'
import type { BusinessProfile } from './types'

export const events: BusinessProfile = {
  type: 'events',
  displayName: 'Eventos y carreras',
  emoji: '🏁',
  staffLabel: { singular: 'Organizador', plural: 'Organizadores' },
  staffIcon: Flag,
  // Sin agenda de citas: el flujo central es la inscripción pública con pago (/carrera/[slug]) y la lista de inscritos.
  capabilities: new Set(['events']),
  modules: [
    { id: 'inscritos', href: '/inscritos', title: 'Inscritos' },
    { id: 'settings',  href: '/settings',  title: 'Configuración' },
  ],
}
