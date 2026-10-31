'use client'

import type { CSSProperties, ReactNode } from 'react'
import { SITE, waLink, waMessage } from '@/lib/site'
import { track } from '@/lib/analytics'

/** Link a WhatsApp de ventas: abre en pestaña nueva y registra el clic con la sección de origen. */
export function WhatsAppLink({ section, giro, message, className, style, children }: {
  section: string
  giro?: string
  message?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <a
      href={waLink(message ?? waMessage(giro))}
      target="_blank"
      rel="noopener noreferrer"
      data-section={section}
      data-wa-number={SITE.whatsappNumber}
      onClick={() => track('whatsapp_click', { section, giro: giro ?? 'general' })}
      className={className}
      style={style}
    >
      {children}
    </a>
  )
}
