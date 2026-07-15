import { FlaskConical } from 'lucide-react'
import type { BusinessProfile } from './types'

export const laboratory: BusinessProfile = {
  type: 'laboratory',
  displayName: 'Laboratorio clínico',
  emoji: '🧪',
  staffLabel: { singular: 'Químico', plural: 'Químicos' },
  staffIcon: FlaskConical,
  // Sin motor de citas: el flujo central son órdenes de laboratorio.
  // 'lab-orders' habilita catálogo de estudios, órdenes y captura de resultados.
  capabilities: new Set(['clinical-records', 'lab-orders']),
  // Los módulos de lab (órdenes, catálogo, lista de trabajo) se agregan aquí
  // cuando sus rutas existan (fases 2-5). Por ahora solo módulos compartidos.
  modules: [
    { id: 'patients',      href: '/patients',      title: null },
    { id: 'staff',         href: '/staff',         title: null },
    { id: 'conversations', href: '/conversations', title: 'Conversaciones' },
    { id: 'finanzas',      href: '/finanzas',      title: 'Finanzas' },
    { id: 'analytics',     href: '/analytics',     title: 'Analytics' },
    { id: 'settings',      href: '/settings',      title: 'Configuración' },
  ],
}
