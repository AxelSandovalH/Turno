// Giros que atiende Turno. Vive en su propio módulo porque lo consumen dos
// lugares distintos de la landing: el SegmentPicker del hero (solo emoji+name,
// mapeado 1:1 por índice contra SCENARIOS de whatsapp-mockup) y el
// SegmentShowcase, que además usa pain/bullets/preview.

export interface SegmentPreviewRow {
  time: string
  title: string
  who: string
}

export interface Segment {
  emoji: string
  name: string
  /** Etiqueta corta para el chip flotante de /segments — el nombre completo
   *  no cabe bien bajo una burbuja de 64px (ver segment-showcase.tsx) */
  short: string
  /** Acento de color propio del giro — rompe el "todo morado" y ayuda a
   *  distinguir de un vistazo en qué giro estás parado. */
  accent: string
  pain: string
  bullets: string[]
  /** Etiqueta que el producto usa para el "staff" de este giro */
  staffLabel: string
  /** Mini agenda de ejemplo — hace tangible el "hecho para tu giro" */
  preview: SegmentPreviewRow[]
  /** Módulo del panel que muestra la ventana de ejemplo. Por defecto la agenda. */
  window?: { path: string; title: string }
}

export const SEGMENTS: Segment[] = [
  {
    emoji: '💈',
    name: 'Barberías y estéticas',
    short: 'Barberías',
    accent: '#7c3aed',
    pain: 'El cliente que te escribe mientras cortas, no espera: agenda con el de enfrente.',
    bullets: [
      'Turno contesta mientras tú sigues con las tijeras en la mano',
      'Cada barbero con su agenda — se acabó el "a mí me dijeron a las 5"',
      'Recordatorio automático: menos sillas vacías por plantones',
    ],
    staffLabel: 'Barbero',
    preview: [
      { time: '10:00', title: 'Corte + barba', who: 'Carlos' },
      { time: '11:30', title: 'Corte clásico', who: 'Rodrigo' },
      { time: '13:00', title: 'Diseño / línea', who: 'Carlos' },
    ],
  },
  {
    emoji: '💆',
    name: 'Spas y bienestar',
    short: 'Spas',
    accent: '#ec4899',
    pain: 'Tu cabina vacía por una cancelación de último minuto es dinero que ya no regresa.',
    bullets: [
      'Confirmación un día antes: si no pueden ir, el espacio se libera a tiempo',
      'Anticipo por Stripe al reservar — quien aparta en serio, llega',
      'Responde precios y paquetes a las 11 pm, cuando tus clientas planean su semana',
    ],
    staffLabel: 'Terapeuta',
    preview: [
      { time: '11:00', title: 'Masaje relajante 60 min', who: 'Daniela' },
      { time: '12:30', title: 'Facial hidratante', who: 'Mariana' },
      { time: '16:00', title: 'Masaje profundo 90 min', who: 'Daniela' },
    ],
  },
  {
    emoji: '🏥',
    name: 'Consultorios y clínicas',
    short: 'Clínicas',
    accent: '#3b82f6',
    pain: 'Tu asistente no puede contestar WhatsApp, agendar y recibir pacientes al mismo tiempo.',
    bullets: [
      'Agenda, reagenda y cancela sin interrumpir la consulta',
      'Expediente y historial del paciente en un solo lugar',
      'El paciente confirma con un SI — y tú ves tu día real, no el teórico',
    ],
    staffLabel: 'Doctor',
    preview: [
      { time: '09:00', title: 'Limpieza dental', who: 'Dra. Ramírez' },
      { time: '10:30', title: 'Consulta de valoración', who: 'Dr. Lomelí' },
      { time: '12:00', title: 'Resina estética', who: 'Dra. Ramírez' },
    ],
  },
  {
    emoji: '🧠',
    name: 'Psicología y terapia',
    short: 'Psicología',
    accent: '#14b8a6',
    pain: 'Cobrar la sesión que el paciente olvidó es incómodo; perderla, insostenible.',
    bullets: [
      'Recordatorios que cuidan la constancia del tratamiento',
      'Reagendar es una conversación, no una llamada incómoda',
      'Tu horario protegido: sin dobles reservas ni huecos sorpresa',
    ],
    staffLabel: 'Terapeuta',
    preview: [
      { time: '16:00', title: 'Sesión individual', who: 'Lic. Fuentes' },
      { time: '17:00', title: 'Terapia de pareja', who: 'Lic. Fuentes' },
      { time: '18:30', title: 'Sesión individual', who: 'Lic. Soto' },
    ],
  },
  {
    emoji: '🔬',
    name: 'Laboratorios clínicos',
    short: 'Laboratorios',
    accent: '#06b6d4',
    pain: 'Pacientes llamando todo el día para preguntar si ya están sus resultados.',
    bullets: [
      'Resultados enviados por WhatsApp y correo con un clic',
      'Órdenes, captura y reportes con cédula del responsable',
      'Recepción sin filas: el paciente llega con todo resuelto',
    ],
    staffLabel: 'Responsable',
    preview: [
      { time: '07:30', title: 'Química sanguínea', who: 'Recepción' },
      { time: '08:00', title: 'Biometría hemática', who: 'QFB Núñez' },
      { time: '08:40', title: 'Perfil tiroideo', who: 'QFB Núñez' },
    ],
  },
  {
    emoji: '⛵',
    name: 'Charters de yates y pesca',
    short: 'Embarcaciones',
    accent: '#f59e0b',
    pain: 'Una reserva sin anticipo que no llega al muelle te cuesta el día entero de la embarcación.',
    bullets: [
      'Anticipo por Stripe al reservar — la salida queda asegurada',
      'Contesta a turistas a cualquier hora, en el momento en que planean su viaje',
      'Cada capitán y embarcación con su propio calendario',
    ],
    staffLabel: 'Capitán',
    preview: [
      { time: '07:00', title: 'Salida de pesca · 6 h', who: 'Cap. Mendoza' },
      { time: '13:30', title: 'Paseo costero · 3 h', who: 'Cap. Rivas' },
      { time: '17:00', title: 'Atardecer · 2 h', who: 'Cap. Mendoza' },
    ],
  },
  {
    emoji: '🌴',
    name: 'Tours y actividades',
    short: 'Tours',
    accent: '#f97316',
    pain: 'Un turista que escribe a medianoche no espera: si no le contestas en minutos, reserva con otro operador.',
    bullets: [
      'Turno contesta a turistas 24/7 y les manda el link con las fotos de cada tour',
      'Anticipo por Stripe al reservar: la salida queda asegurada',
      'Cada guía con su propio calendario y precios "desde" según el grupo',
    ],
    staffLabel: 'Guía',
    preview: [
      { time: '07:30', title: 'Snorkel · Santa María', who: 'Guía Marco' },
      { time: '10:00', title: 'Avistamiento de ballenas', who: 'Guía Ana' },
      { time: '16:30', title: 'Atardecer en velero', who: 'Guía Marco' },
    ],
  },
  {
    emoji: '🎨',
    name: 'Estudios de tatuaje',
    short: 'Tattoo',
    accent: '#ef4444',
    pain: 'Una sesión de horas apartada sin anticipo, cancelada a última hora, es un día entero perdido.',
    bullets: [
      'Anticipo por Stripe al reservar — quien aparta, se compromete',
      'Cada tatuador con su propia agenda y portafolio de precios',
      'Contesta consultas a medianoche, cuando el cliente decide animarse',
    ],
    staffLabel: 'Tatuador',
    preview: [
      { time: '12:00', title: 'Sesión brazo · 4 h', who: 'Iván' },
      { time: '16:30', title: 'Retoque', who: 'Sofía' },
      { time: '18:00', title: 'Diseño pequeño', who: 'Iván' },
    ],
  },
  {
    emoji: '🌮',
    name: 'Restaurantes y comida para llevar',
    short: 'Restaurantes',
    accent: '#22c55e',
    pain: 'Los pedidos por WhatsApp se pierden entre mensajes, audios y capturas, y mientras contestas no cocinas.',
    bullets: [
      'Turno toma el pedido por chat, con extras y notas, y manda las fotos de tus platillos',
      'Link de menú con carrito para pedir a domicilio o para recoger, sin comisiones por pedido',
      'Pago con tarjeta en línea por Stripe: el pedido llega a tu cocina ya pagado',
    ],
    staffLabel: 'Pedidos',
    window: { path: 'orders', title: 'Hoy · Pedidos' },
    preview: [
      { time: '13:05', title: 'Bowl de pollo + aguacate extra', who: 'A domicilio' },
      { time: '13:12', title: '2 tacos al pastor y agua', who: 'Recoger' },
      { time: '13:20', title: 'Smoothie verde y tostada', who: 'A domicilio' },
    ],
  },
]
