// Datos del sitio en un solo lugar: marca, contacto y WhatsApp de ventas. Lo que aún no está definido queda como null
// (TODO) y la interfaz lo oculta en lugar de mostrar un dato falso.

export const SITE = {
  brand: 'QuickTurno',
  url: 'https://www.quickturno.app',
  /** Responsable del tratamiento de datos (persona física que opera el servicio). */
  legalName: 'Axel Leonardo Sandoval Heredia',
  /** WhatsApp de ventas, con lada de país y sin signos: 52 + 10 dígitos. */
  whatsappNumber: '523122265985',
  whatsappDisplay: '+52 312 226 5985',
  /** TODO: correo de contacto (aviso de privacidad, términos y footer). Define NEXT_PUBLIC_CONTACT_EMAIL en Vercel. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  /** Mensajes de la prueba gratis incluidos con el Asistente de WhatsApp. */
  trialMessages: 50,
  trialDays: 7,
} as const

/** Link wa.me con mensaje prellenado. */
export function waLink(message: string): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`
}

/** Mensaje inicial de WhatsApp; `giro` lo personaliza ("barbería", "restaurante"…). */
export function waMessage(giro?: string): string {
  return `Hola, quiero ver una demo de QuickTurno para mi ${giro || 'negocio'}`
}
