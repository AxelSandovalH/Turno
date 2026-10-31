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

// Farmacia con Rancho McCoy: cotización calculada por el sistema (cargo 4 %, sin IVA) y solicitud del anticipo del 40 %
export const ranchoTools: Tool[] = [
  {
    name: 'rancho_quote',
    description: 'Calcula la cotización de un evento en Rancho McCoy con las tarifas oficiales: renta por invitados más los extras que pida, 4 % de cargo (sin IVA), y el anticipo del 40 % para apartar la fecha, en MXN o USD. USA SIEMPRE esta herramienta para dar totales del rancho; nunca sumes tú. Es solo un estimado: no aparta fecha ni cobra.',
    input_schema: { type: 'object' as const, properties: {
        list: { type: 'string', enum: ['general', 'destination'], description: "'destination' si el cliente escribe en inglés o es turista/extranjero; 'general' si escribe en español." },
        guests: { type: 'number', description: 'Número de invitados (1 a 199).' },
        cabins: { type: 'number', description: 'Cabañas: 0, 1 o 2.' },
        extra_hours: { type: 'number', description: 'Horas extra del rancho: 0, 1 o 2.' },
        horses: { type: 'boolean', description: 'Experiencia con dos caballos.' },
        photo: { type: 'string', enum: ['none', 'ranch', 'beach'], description: 'Sesión de fotos en el rancho, en la playa o ninguna.' },
        dinner: { type: 'boolean', description: 'Cena por platillo para todos los invitados.' },
        open_bar: { type: 'boolean', description: 'Barra libre para todos los invitados.' },
        crossback_chairs: { type: 'boolean', description: 'Silla crossback para todos los invitados.' },
        staff_hours: { type: 'number', description: 'Horas de personal operativo (6 = paquete; 0 si no lo quiere).' },
        audio: { type: 'boolean', description: 'Equipo de audio (6 h).' },
        currency: { type: 'string', enum: ['MXN', 'USD'], description: 'Moneda en la que el cliente quiere ver y pagar; pregúntaselo.' },
      }, required: ['list', 'guests', 'currency'] },
  },
  {
    name: 'rancho_request_deposit',
    description: 'Pide al responsable autorizar el link de pago del ANTICIPO (40 % del total, con el cargo) para apartar la fecha de un evento en Rancho McCoy. El monto lo calcula el sistema con los mismos datos; tú NO envías el link: si el responsable aprueba (confirmando fecha y disponibilidad), el sistema se lo manda al cliente. Úsala solo cuando el cliente ya aceptó el estimado y diste fecha, invitados y moneda.',
    input_schema: { type: 'object' as const, properties: {
        list: { type: 'string', enum: ['general', 'destination'], description: "'destination' si el cliente escribe en inglés o es turista/extranjero; 'general' si escribe en español." },
        guests: { type: 'number', description: 'Número de invitados (1 a 199).' },
        cabins: { type: 'number', description: 'Cabañas: 0, 1 o 2.' },
        extra_hours: { type: 'number', description: 'Horas extra del rancho: 0, 1 o 2.' },
        horses: { type: 'boolean', description: 'Experiencia con dos caballos.' },
        photo: { type: 'string', enum: ['none', 'ranch', 'beach'], description: 'Sesión de fotos en el rancho, en la playa o ninguna.' },
        dinner: { type: 'boolean', description: 'Cena por platillo para todos los invitados.' },
        open_bar: { type: 'boolean', description: 'Barra libre para todos los invitados.' },
        crossback_chairs: { type: 'boolean', description: 'Silla crossback para todos los invitados.' },
        staff_hours: { type: 'number', description: 'Horas de personal operativo (6 = paquete; 0 si no lo quiere).' },
        audio: { type: 'boolean', description: 'Equipo de audio (6 h).' },
        currency: { type: 'string', enum: ['MXN', 'USD'], description: 'Moneda en la que el cliente quiere ver y pagar; pregúntaselo.' },
        event_date: { type: 'string', description: 'Fecha del evento (YYYY-MM-DD) o la que dio el cliente.' },
        event_type: { type: 'string', description: 'Tipo de evento (boda, quinceañera, cumpleaños...).' },
        customer_name: { type: 'string', description: 'Nombre del cliente.' },
      }, required: ['list', 'guests', 'currency', 'event_date', 'event_type'] },
  },
]

// Farmacia: pedido que el cliente pidió gestionar con el concierge (sin los candados del catálogo; lo confirma una persona)
export const conciergeTools: Tool[] = [
  {
    name: 'create_concierge_order',
    description: 'Registra un pedido para que lo gestione el concierge (Sergio) SOLO cuando el cliente eligió expresamente hablar con el concierge / farmacéutico para ese pedido. Funciona sin las restricciones del catálogo: sirve para medicamentos controlados, con indicación médica o agotados. NO cobra ni confirma nada: queda como solicitud y el concierge confirma disponibilidad, precio, requisitos y pago con el cliente. Llama antes handoff_to_owner con la consulta; no la uses si el cliente solo preguntó o no eligió el concierge.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_name: { type: 'string', description: 'Nombre del cliente.' },
        fulfillment: { type: 'string', enum: ['delivery', 'pickup'], description: 'Entrega en el lobby del hotel (delivery) o recoger.' },
        address: { type: 'string', description: 'Hotel o edificio (lobby); sin número de habitación.' },
        notes: { type: 'string', description: 'Lo que el cliente pidió o aclaró, en sus palabras.' },
        items: { type: 'array', description: 'Productos que pide.', items: { type: 'object', properties: { name: { type: 'string' }, quantity: { type: 'number' }, notes: { type: 'string' } }, required: ['name', 'quantity'] } },
      },
      required: ['customer_name', 'items'],
    },
  },
]

// Farmacia: el bot le pasa el caso al responsable (receta, controlados, urgencias, quejas, o si piden hablar con una persona)
export const handoffTools: Tool[] = [
  {
    name: 'handoff_to_owner',
    description: 'Le consulta por WhatsApp al responsable de la farmacia (farmacéutico) lo que necesites para ayudar a este cliente. El responsable te contesta a ti y tú le comunicas la respuesta al cliente. Úsala cuando el cliente pregunte por medicamentos con receta o controlados (antibióticos, insulinas, antidepresivos, ansiolíticos, analgésicos fuertes, etc.), cuando mande una receta, cuando haya una urgencia o síntoma que requiere criterio médico, una queja, o cuando pida hablar con una persona. No tomas decisiones sobre el medicamento: solo recopilas lo necesario y la llamas. Después de llamarla, dile al cliente que lo estás confirmando con el farmacéutico y que le respondes por aquí, sin mencionar receta ni prescripción.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', enum: ['receta', 'controlado', 'urgencia', 'queja', 'hablar_con_persona', 'concierge', 'cotizacion', 'otro'], description: 'Por qué se le pasa al responsable (concierge: el cliente ELIGIÓ hablar con el concierge y a partir de ahí el responsable lleva la conversación; cotizacion: servicio o evento que se cotiza con el equipo).' },
        summary: { type: 'string', description: 'La consulta para el farmacéutico, clara y completa: qué pide el cliente (medicamento o producto, cantidad), hotel o lugar y nombre, y qué necesitas que te confirme (disponibilidad, precio, tiempo).' },
        customer_name: { type: 'string', description: 'Nombre del cliente si lo tienes.' },
      },
      required: ['reason', 'summary'],
    },
  },
]
