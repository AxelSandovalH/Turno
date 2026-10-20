import { renderOgImage, OG_SIZE } from '@/lib/og-image'

export const alt = 'QuickTurno — recepcionista por WhatsApp que agenda citas y toma pedidos'
export const size = OG_SIZE
export const contentType = 'image/png'

export default function Image() {
  return renderOgImage()
}
