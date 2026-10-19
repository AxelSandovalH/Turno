import type { Tool } from '@anthropic-ai/sdk/resources/messages'

export const tools: Tool[] = [
  {
    name: 'get_business_info',
    description: 'Obtiene los servicios disponibles, precios y horarios del negocio. Llama esto al inicio de cada conversación o cuando el cliente pregunte por servicios o precios.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_available_slots',
    description: 'Consulta los slots de tiempo disponibles para agendar una cita. Devuelve hasta 10 horarios disponibles.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD. Si el cliente dice "mañana" o un día de la semana, conviértelo.',
        },
        service_id: {
          type: 'string',
          description: 'ID del servicio. Obtenerlo primero con get_business_info.',
        },
        staff_id: {
          type: 'string',
          description: 'ID del barbero. Opcional — si el cliente no tiene preferencia, omitir.',
        },
      },
      required: ['date', 'service_id'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Crea una cita. Solo llamar cuando el cliente haya confirmado explícitamente el horario, servicio y barbero.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_name: { type: 'string', description: 'Nombre del cliente' },
        customer_phone: { type: 'string', description: 'Número de WhatsApp del cliente en formato E.164' },
        service_id: { type: 'string', description: 'ID del servicio' },
        staff_id: { type: 'string', description: 'ID del barbero' },
        starts_at: { type: 'string', description: 'Fecha y hora de inicio en formato ISO 8601 UTC' },
      },
      required: ['customer_name', 'customer_phone', 'service_id', 'staff_id', 'starts_at'],
    },
  },
  {
    name: 'get_customer_appointments',
    description: 'Obtiene las citas activas (confirmadas) del cliente. Usar cuando el cliente pregunte por sus citas o quiera reagendar/cancelar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_phone: { type: 'string', description: 'Número de WhatsApp del cliente' },
      },
      required: ['customer_phone'],
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancela una cita existente. Solo llamar si el cliente confirmó explícitamente que quiere cancelar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        appointment_id: { type: 'string', description: 'ID de la cita a cancelar' },
        reason: { type: 'string', description: 'Motivo de cancelación mencionado por el cliente' },
      },
      required: ['appointment_id'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: 'Reagenda una cita a un nuevo horario. El nuevo slot debe obtenerse con get_available_slots primero.',
    input_schema: {
      type: 'object' as const,
      properties: {
        appointment_id: { type: 'string', description: 'ID de la cita a reagendar' },
        new_starts_at: { type: 'string', description: 'Nueva fecha y hora de inicio en ISO 8601 UTC' },
        new_staff_id: { type: 'string', description: 'Nuevo barbero si cambió' },
      },
      required: ['appointment_id', 'new_starts_at'],
    },
  },
]

// Herramientas para negocios de pedidos y delivery (capacidad 'orders')
export const orderTools: Tool[] = [
  {
    name: 'get_menu',
    description: 'Obtiene el menú completo con categorías, platillos, precios, extras y disponibilidad, más las reglas de entrega (costo de envío, pedido mínimo, formas de pago). Llámala antes de mostrar o recomendar cualquier platillo y antes de armar un pedido.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'send_menu_photos',
    description: 'Envía por WhatsApp las fotos de los platillos al cliente, cada una con su nombre y precio. Úsala cada vez que le muestres o recomiendes platillos de una categoría o por nombre. Se envían como máximo 6 fotos por llamada.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Nombre de la categoría cuyas fotos enviar (ej. Bowls). Úsalo cuando el cliente pide ver una categoría.' },
        names: { type: 'array', items: { type: 'string' }, description: 'Nombres de platillos específicos. Úsalo cuando el cliente pregunta por platillos concretos. Tiene prioridad sobre category.' },
      },
      required: [],
    },
  },
  {
    name: 'create_order',
    description: 'Registra el pedido del cliente. Llámala SOLO después de que el cliente confirmó explícitamente el resumen y el total. Los precios los calcula el sistema. El pago es siempre con tarjeta: devuelve un payment_link que debes compartir con el cliente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_name: { type: 'string', description: 'Nombre del cliente' },
        fulfillment: { type: 'string', enum: ['delivery', 'pickup'], description: 'delivery = a domicilio, pickup = pasa a recoger' },
        address: { type: 'string', description: 'Dirección completa de entrega (obligatoria si es delivery)' },
        notes: { type: 'string', description: 'Notas generales del pedido (opcional)' },
        payment_method: { type: 'string', enum: ['card', 'cash'], description: 'card = tarjeta con link de pago (puede llevar cargo y pasa por aprobación del responsable); cash = efectivo al recibir (solo si el negocio lo permite). Por defecto card.' },
        items: {
          type: 'array',
          description: 'Productos del pedido',
          items: {
            type: 'object',
            properties: {
              menu_item_id: { type: 'string', description: 'ID del platillo, tal cual lo devolvió get_menu' },
              name: { type: 'string', description: 'Nombre exacto del platillo, como aparece en el menú. Siempre inclúyelo: se usa si el ID no coincide.' },
              quantity: { type: 'number', description: 'Cantidad' },
              extras: { type: 'array', items: { type: 'string' }, description: 'Nombres exactos de los extras elegidos (opcional)' },
              notes: { type: 'string', description: 'Nota para ese platillo, ej. sin cebolla (opcional)' },
            },
            required: ['name', 'quantity'],
          },
        },
      },
      required: ['customer_name', 'fulfillment', 'items'],
    },
  },
  {
    name: 'get_order_status',
    description: 'Consulta el estado de los pedidos recientes del cliente que escribe.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
]

// Solo para negocios con Stripe propio: el bot PIDE el link, pero lo envía el sistema cuando el responsable lo aprueba
export const paymentLinkTools: Tool[] = [
  {
    name: 'request_payment_link',
    description: 'Pide al responsable del negocio autorización para enviarle al cliente un link de pago de Stripe por un cobro que NO está en el catálogo ni en los servicios (por ejemplo un paquete o servicio acordado). NUNCA envías el link tú: esta herramienta solo manda la solicitud al responsable; si la aprueba, el sistema le manda el link al cliente. No la uses para pedidos del catálogo (esos ya traen su propio link) ni para citas con anticipo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: { type: 'number', description: 'Monto a cobrar en la moneda del negocio, acordado con el cliente.' },
        description: { type: 'string', description: 'Concepto del cobro, corto y claro (por ejemplo "IV Recovery a domicilio + traslado").' },
        customer_name: { type: 'string', description: 'Nombre del cliente si lo tienes.' },
      },
      required: ['amount', 'description'],
    },
  },
]
