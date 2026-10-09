import { UtensilsCrossed } from 'lucide-react'
import type { BusinessProfile } from './types'
import { ORDER_MODULES } from './shared'

export const restaurant: BusinessProfile = {
  type: 'restaurant',
  displayName: 'Restaurante, taquería o cafetería',
  emoji: '🌮',
  staffLabel: { singular: 'Empleado', plural: 'Empleados' },
  staffIcon: UtensilsCrossed,
  // Sin agenda de citas: el negocio recibe pedidos por WhatsApp y por su link de menú
  capabilities: new Set(['whatsapp-bot', 'orders']),
  modules: ORDER_MODULES,
}
