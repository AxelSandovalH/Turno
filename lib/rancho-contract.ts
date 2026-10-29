import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

/**
 * Plantilla maestra del contrato de evento de Rancho McCoy (PDF). Las secciones opcionales (cabañas, caballos,
 * banquete, personal, audio, decoración) aparecen solo si el evento las trae. El texto fijo sale de los contratos reales
 * del rancho; debe revisarlo el propietario (o un abogado) antes de usarse con clientes.
 */
export interface ContractItem { label: string; amount?: number }
export interface ContractData {
  client_names: string[]
  event_type: string
  event_date: string
  guests: number
  city_date?: string                 // "Los Cabos San Lucas B.C.S., 22 de octubre de 2026"; si falta, se usa hoy
  hours?: number                     // horas de renta (default 6)
  schedule?: string                  // "7:30 pm a 3:30 am"; default "a elegir con previo aviso"
  cabins?: { count: number; checkin?: string; checkout?: string }
  horses?: { participations?: number; photo_sessions?: number }
  banquet?: { menu?: string; per_person?: number }
  staff?: string                     // "10 meseros, 1 bartender, 9 horas de servicio"
  audio_lighting?: string            // "Equipo de audio e iluminación, una persona de música y un presentador"
  decor?: string[]
  items?: ContractItem[]             // desglose económico
  total: number
  deposit_paid: number
  deposit_note?: string              // "Pagado en USD ($300 USD)"
  balance_days?: number              // días naturales antes del evento para liquidar (default 15)
  extra_clauses?: string[]
}

export const OWNER_NAME = 'Sergio Núñez'
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const mx = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MXN`
const clean = (s: string) => s.replace(/[^\x20-\x7E -ÿ•–—“”‘’¿¡]/g, '').replace(/\s+\n/g, '\n')

export function contractMissing(d: Partial<ContractData>): string[] {
  const miss: string[] = []
  if (!d.client_names?.length || !d.client_names[0]) miss.push('nombre del cliente')
  if (!d.event_type) miss.push('tipo de evento')
  if (!d.event_date) miss.push('fecha del evento')
  if (!(Number(d.guests) > 0)) miss.push('número de invitados')
  if (!(Number(d.total) > 0)) miss.push('inversión total')
  if (d.deposit_paid == null || !(Number(d.deposit_paid) >= 0)) miss.push('anticipo recibido')
  return miss
}

export async function buildContractPdf(d: ContractData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const W = 595, H = 842, M = 56, CW = W - M * 2
  let page: PDFPage = pdf.addPage([W, H])
  let y = H - M
  const ink = rgb(0.1, 0.1, 0.1)

  const wrap = (text: string, f: PDFFont, size: number, width: number): string[] => {
    const out: string[] = []
    for (const para of clean(text).split('\n')) {
      let cur = ''
      for (const w of para.split(' ')) {
        const t = cur ? `${cur} ${w}` : w
        if (!cur || f.widthOfTextAtSize(t, size) <= width) cur = t
        else { out.push(cur); cur = w }
      }
      out.push(cur)
    }
    return out
  }
  const ensure = (h: number) => { if (y - h < M + 30) { page = pdf.addPage([W, H]); y = H - M } }
  const text = (t: string, o: { size?: number; b?: boolean; indent?: number; gap?: number; center?: boolean } = {}) => {
    const size = o.size ?? 10.5, f = o.b ? bold : font, indent = o.indent ?? 0
    for (const line of wrap(t, f, size, CW - indent)) {
      ensure(size * 1.45)
      const x = o.center ? (W - f.widthOfTextAtSize(line, size)) / 2 : M + indent
      page.drawText(line, { x, y: y - size, size, font: f, color: ink })
      y -= size * 1.45
    }
    y -= o.gap ?? 4
  }
  const h2 = (t: string) => { y -= 6; ensure(30); text(t, { b: true, size: 11.5, gap: 6 }) }
  const bullet = (t: string) => text(`•  ${t}`, { indent: 14, gap: 2 })
  const row = (label: string, value: string, strong = false) => {
    ensure(16)
    page.drawText(clean(label), { x: M + 14, y: y - 11, size: 10.5, font: strong ? bold : font, color: ink })
    const v = clean(value), vw = (strong ? bold : font).widthOfTextAtSize(v, 10.5)
    page.drawText(v, { x: W - M - vw, y: y - 11, size: 10.5, font: strong ? bold : font, color: ink })
    y -= 16
  }

  const now = new Date()
  const cityDate = d.city_date || `LOS CABOS SAN LUCAS B.C.S., ${now.getDate()} de ${MONTHS[now.getMonth()]} de ${now.getFullYear()}`
  const hours = d.hours ?? 6
  const clients = d.client_names.filter(Boolean)
  const balance = Math.max(Math.round((d.total - d.deposit_paid) * 100) / 100, 0)
  const balanceDays = d.balance_days ?? 15

  text('RANCHO MC COY', { b: true, size: 16, center: true, gap: 2 })
  text('El Tezal · Cabo San Lucas, B.C.S.', { size: 9.5, center: true, gap: 10 })
  text(cityDate, { size: 10, gap: 8 })
  text('CONTRATO DE EVENTO', { b: true, size: 14, center: true, gap: 10 })
  text(`EVENTO: ${d.event_type.toUpperCase()}`, { b: true, gap: 2 })
  text(`Cliente: ${clients.join(' y ')}`, { b: true, gap: 2 })
  text(`Fecha del evento: ${d.event_date}`, { b: true, gap: 2 })
  text(`Número de invitados: ${d.guests} personas`, { b: true, gap: 8 })

  h2('I. OBJETO DEL CONTRATO')
  text(`Rancho Mc Coy, representado por el Sr. ${OWNER_NAME}, se obliga a prestar servicios integrales de renta de instalaciones${d.staff || d.banquet ? ' y de servicio' : ''} para la realización del evento social descrito, en la fecha convenida y bajo las condiciones establecidas en el presente documento.`)

  h2('II. SERVICIOS INCLUIDOS')
  text(`1. Renta exclusiva del recinto (${hours} horas)`, { b: true, gap: 2 })
  text(`Horario del evento: ${d.schedule || 'a elegir con previo aviso.'}`, { gap: 2 })
  text('Incluye:', { gap: 2 })
  for (const t of ['Uso de palapa principal y explanada', 'Área de cocina equipada', 'Barra para servicio de bebidas', 'Sanitarios operativos', 'Área de estacionamiento', 'Mobiliario clásico completo (mesas, sillas, cubresillas y mantelería blanca)']) bullet(t)
  let n = 2
  if (d.cabins?.count) {
    y -= 4
    text(`${n++}. Cabañas`, { b: true, gap: 2 })
    bullet(`${d.cabins.count === 1 ? 'Una cabaña' : `${d.cabins.count} cabañas`} con baño, entregada${d.cabins.count === 1 ? '' : 's'} en perfectas condiciones.`)
    bullet(`Check-in: ${d.cabins.checkin || '3:00 pm'}. Check-out: ${d.cabins.checkout || '12:00 pm del día siguiente'}.`)
    bullet('Los invitados al evento no implican automáticamente hospedaje. No se permite after party fuera del horario del evento.')
  }
  if (d.banquet) {
    y -= 4
    text(`${n++}. Servicio de banquete`, { b: true, gap: 2 })
    if (d.banquet.menu) bullet(`Menú seleccionado: ${d.banquet.menu}`)
    if (d.banquet.per_person) bullet(`Costo por persona: ${mx(d.banquet.per_person)}. Total para ${d.guests} invitados: ${mx(d.banquet.per_person * d.guests)}.`)
  }
  if (d.staff) { y -= 4; text(`${n++}. Personal profesional de servicio`, { b: true, gap: 2 }); bullet(d.staff) }
  if (d.audio_lighting) { y -= 4; text(`${n++}. Audio e iluminación`, { b: true, gap: 2 }); bullet(d.audio_lighting) }
  if (d.decor?.length) { y -= 4; text(`${n++}. Decoración`, { b: true, gap: 2 }); d.decor.forEach(bullet) }

  if (d.horses?.participations || d.horses?.photo_sessions) {
    h2('III. USO DE CABALLOS Y EXHIBICIÓN')
    text('1. El servicio incluye:', { gap: 2 })
    if (d.horses.participations) bullet(`${d.horses.participations} participación${d.horses.participations === 1 ? '' : 'es'} durante el evento (entrada, exhibición o momento especial), en las áreas designadas por el personal del rancho.`)
    if (d.horses.photo_sessions) bullet(`${d.horses.photo_sessions} sesión${d.horses.photo_sessions === 1 ? '' : 'es'} de fotos con caballo, que podrá realizarse previo al evento o durante el mismo, sujeta a disponibilidad y logística del rancho.`)
    text('Todos los caballos serán guiados y supervisados en todo momento por personal especializado del rancho (caballerango).', { gap: 4 })
    text('2. Condiciones de uso y seguridad:', { gap: 2 })
    for (const t of ['Los caballos destinados a exhibición NO SON PARA MONTA por parte de los invitados.', 'El acercamiento al animal deberá mantener una distancia mínima de 2 metros, salvo indicación del personal encargado.', 'Queda estrictamente prohibido alimentar, asustar, montar o manipular a los caballos sin autorización.', 'En sesión de fotos, el uso será controlado y supervisado en todo momento por el personal del rancho.']) bullet(t)
    text('El propietario del lugar no se hace responsable de incidentes derivados del mal uso, desobediencia de indicaciones o conductas indebidas durante la interacción con los caballos.', { gap: 4 })
  }

  h2('IV. INVERSIÓN TOTAL DEL EVENTO')
  for (const it of d.items ?? []) row(it.label, it.amount != null ? mx(it.amount) : '')
  row('INVERSIÓN TOTAL', mx(d.total), true)

  h2('V. PAGOS')
  row('Anticipo recibido', mx(d.deposit_paid))
  if (d.deposit_note) text(d.deposit_note, { size: 9.5, indent: 14, gap: 2 })
  row('Saldo pendiente', mx(balance), true)
  y -= 4
  text(`El saldo deberá liquidarse a más tardar ${balanceDays} días naturales antes del evento. En caso de retraso en el pago final se aplicará un recargo del 15% sobre el saldo pendiente.`)
  text('En caso de rescindir el contrato, el anticipo se pierde (no tiene devolución) por daños y perjuicios y por gastos de operación, ya que la fecha del evento queda apartada y se deja de ofrecer la fecha acordada.')
  text('Si el pago se realiza a través de terminal punto de venta, se agrega el IVA. Si requiere factura, favor de informarlo.')

  h2('VI. CONDICIONES GENERALES')
  const conds = [
    `El horario contratado es estrictamente de ${hours} horas${d.schedule ? ` (${d.schedule})` : ''}.`,
    'Cualquier extensión adicional deberá autorizarse previamente y tendrá costo adicional.',
    'No se permite pirotecnia ni artículos inflamables dentro de la palapa.',
    'El cliente será responsable por los daños o la pérdida de materiales ocasionados por sus invitados dentro de las instalaciones.',
    'Rancho Mc Coy no se hace responsable por accidentes derivados del consumo de bebidas alcohólicas, ni por la seguridad de los asistentes, sus bienes personales o robos.',
    'La supervisión y seguridad de los menores es responsabilidad exclusiva de los padres o tutores.',
    'A la hora establecida se deberá desocupar el lugar, ya que se cerrará u ocupará para eventos futuros.',
    'El anticipo recibido garantiza la reserva exclusiva de la fecha contratada.',
    ...(d.extra_clauses ?? []),
  ]
  conds.forEach((c, i) => text(`${i + 1}. ${c}`, { indent: 6, gap: 3 }))

  h2('VII. ACEPTACIÓN')
  text('Leído el presente contrato y estando de acuerdo ambas partes con su contenido, lo firman para constancia.', { gap: 28 })
  ensure(70)
  const sigY = y - 30
  page.drawLine({ start: { x: M, y: sigY }, end: { x: M + 200, y: sigY }, thickness: 0.7, color: ink })
  page.drawLine({ start: { x: W - M - 200, y: sigY }, end: { x: W - M, y: sigY }, thickness: 0.7, color: ink })
  page.drawText(OWNER_NAME, { x: M, y: sigY - 14, size: 10.5, font: bold, color: ink })
  page.drawText('Rancho McCoy', { x: M, y: sigY - 27, size: 10, font, color: ink })
  const cl = clean(clients.join(' y ')), clw = bold.widthOfTextAtSize(cl, 10.5)
  page.drawText(cl, { x: Math.max(W - M - 200, W - M - clw), y: sigY - 14, size: Math.min(10.5, 10.5), font: bold, color: ink })
  page.drawText('Cliente', { x: W - M - 200, y: sigY - 27, size: 10, font, color: ink })

  const pages = pdf.getPages()
  pages.forEach((p, i) => p.drawText(`Rancho McCoy · Contrato de evento · Página ${i + 1} de ${pages.length}`, { x: M, y: 28, size: 8, font, color: rgb(0.45, 0.45, 0.45) }))
  return pdf.save()
}
