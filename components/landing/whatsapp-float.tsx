'use client'

import { MessageCircle } from 'lucide-react'
import { WhatsAppLink } from './whatsapp-link'

/** Botón flotante de WhatsApp, visible en móvil y escritorio. */
export function WhatsAppFloat({ giro }: { giro?: string }) {
  return (
    <WhatsAppLink
      section="flotante"
      giro={giro}
      className="fixed z-50 flex items-center gap-2 rounded-full text-white shadow-lg transition-transform hover:scale-105"
      style={{ right: 16, bottom: 16, background: '#25d366', padding: '12px 16px', fontSize: 14, fontWeight: 600 }}
    >
      <MessageCircle size={22} aria-hidden />
      <span className="hidden sm:inline">Escríbenos por WhatsApp</span>
      <span className="sr-only sm:hidden">Escríbenos por WhatsApp</span>
    </WhatsAppLink>
  )
}
