// Prueba social. TODO: reemplaza estas tarjetas de ejemplo por testimonios reales (con permiso del cliente) y quita `placeholder`.
// Mientras una tarjeta sea `placeholder` NO se muestra en producción (solo en desarrollo, con la etiqueta EJEMPLO),
// para no publicar opiniones inventadas.

export interface Testimonial {
  name: string
  business: string
  city: string
  quote: string
  placeholder?: boolean
}

export const TESTIMONIALS: Testimonial[] = [
  { name: 'TODO Nombre del cliente', business: 'TODO Barbería / negocio', city: 'TODO Ciudad', quote: 'TODO: cita real del cliente sobre cómo QuickTurno le ayudó (menos no-shows, citas de noche, pedidos por WhatsApp…).', placeholder: true },
  { name: 'TODO Nombre del cliente', business: 'TODO Restaurante / negocio', city: 'TODO Ciudad', quote: 'TODO: segunda cita real de otro cliente, de preferencia de otro giro.', placeholder: true },
]
