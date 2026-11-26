import type { Tool } from '@anthropic-ai/sdk/resources/messages'

/**
 * Giros con propiedades (limpieza de rentas): el bot además pide la propiedad y la hora límite de entrega.
 * Se amplían las herramientas de citas solo para esos negocios; los demás usan las de siempre.
 */
export function withPropertyTools(tools: Tool[]): Tool[] {
  const extra: Record<string, { props: Record<string, { type: 'string'; description: string }>; required: string[] }> = {
    get_available_slots: {
      props: { deadline: { type: 'string', description: 'Hora límite de entrega ese día, formato HH:MM de 24 horas. Solo se devuelven horarios que terminan antes.' } },
      required: ['deadline'],
    },
    create_appointment: {
      props: {
        property_id: { type: 'string', description: 'ID de una propiedad ya registrada del anfitrión' },
        property_name: { type: 'string', description: 'Nombre de la propiedad si es nueva (omitir si se manda property_id)' },
        property_zone: { type: 'string', description: 'Zona de la propiedad nueva' },
        deadline: { type: 'string', description: 'Hora límite de entrega, formato HH:MM de 24 horas' },
      },
      required: ['deadline'],
    },
    reschedule_appointment: {
      props: { deadline: { type: 'string', description: 'Nueva hora límite HH:MM, solo si el anfitrión la cambia' } },
      required: [],
    },
  }
  return tools.map(t => {
    const e = extra[t.name]
    if (!e) return t
    const schema = t.input_schema as { type: 'object'; properties?: Record<string, unknown>; required?: string[] }
    return { ...t, input_schema: { ...schema, properties: { ...schema.properties, ...e.props }, required: [...(schema.required ?? []), ...e.required] } }
  })
}

/** Instrucciones que sustituyen el flujo de reserva genérico. */
export function propertyPrompt(properties: { id: string; name: string; zone: string | null }[]) {
  const list = properties.length
    ? properties.map(p => `- ${p.name}${p.zone ? ` (${p.zone})` : ''} · property_id: ${p.id}`).join('\n')
    : '(todavía no tiene propiedades registradas: pide nombre y zona)'
  return `
ESTE NEGOCIO LIMPIA PROPIEDADES DE RENTA. Quien escribe es un ANFITRIÓN. Estas reglas SUSTITUYEN al "FLUJO DE RESERVA" de arriba y a cualquier mención de barbero, paciente o cita médica: habla de "limpieza" o "reserva".

PROPIEDADES DE ESTE ANFITRIÓN:
${list}

FLUJO DE RESERVA (no te saltes ningún dato; pregunta de uno en uno lo que falte):
1. Qué propiedad. Si tiene varias, ofrécelas numeradas y permite "otra" (pide nombre y zona). Nunca muestres los property_id.
2. Qué servicio (llama get_business_info).
3. Qué día.
4. A qué hora debe estar lista (hora límite, normalmente antes de que llegue el siguiente huésped).
5. Llama get_available_slots con la fecha, el servicio y deadline. Ofrece máximo 5 horarios. No preguntes por persona salvo que la pida: usa el staff_id del horario elegido y dile quién va.
6. Antes de crear, resume propiedad, servicio, fecha, hora de inicio, persona y hora límite, y pide confirmación.
7. Llama create_appointment con property_id (o property_name y property_zone) y deadline. No pidas teléfono: ya lo tienes. Usa su nombre registrado.
8. Confirma con el resumen completo.

Si no hay horarios que alcancen la hora límite, dilo claro y ofrece otro día o pregunta si se puede entregar más tarde. Nunca prometas terminar después de la hora límite.
Un anfitrión puede tener varias limpiezas a la misma hora en propiedades distintas.
`
}
