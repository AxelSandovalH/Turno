'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, addDays, startOfDay, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Service { id: string; name: string; duration_minutes: number; price: number | null }
interface Staff { id: string; name: string }

interface Props {
  org: { id: string; name: string; whatsapp_number: string }
  services: Service[]
  staff: Staff[]
  accent: string
  ctaLabel: string
}

const DAYS_AHEAD = 14
const SLOT_INTERVAL = 30 // minutes

function generateSlots(startTime: string, endTime: string, durationMin: number, bookedRanges: { start: Date; end: Date }[]): string[] {
  const slots: string[] = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMinutes = sh * 60 + sm
  const endMinutes   = eh * 60 + em

  for (let m = startMinutes; m + durationMin <= endMinutes; m += SLOT_INTERVAL) {
    const h = Math.floor(m / 60).toString().padStart(2, '0')
    const min = (m % 60).toString().padStart(2, '0')
    const slotStart = new Date()
    slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60000)

    const overlaps = bookedRanges.some(b => slotStart < b.end && slotEnd > b.start)
    if (!overlaps) slots.push(`${h}:${min}`)
  }
  return slots
}

export function BookingForm({ org, services, staff, accent, ctaLabel }: Props) {
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)

  const selectedService = services.find(s => s.id === serviceId)
  const selectedStaff   = staff.find(s => s.id === staffId)

  // Available dates grid (14 days from today)
  const today = startOfDay(new Date())
  const dates = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i + 1))
  const visibleDates = dates.slice(weekOffset * 7, weekOffset * 7 + 7)

  // Fetch slots when date + service + staff selected
  useEffect(() => {
    if (!selectedDate || !serviceId || !staffId) { setSlots([]); return }

    setLoadingSlots(true)
    setSelectedSlot('')

    const dayOfWeek = selectedDate.getDay()
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    Promise.all([
      // Get staff schedule for this day
      supabase.from('staff_schedules')
        .select('start_time, end_time, is_working')
        .eq('staff_id', staffId)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle(),
      // Get existing appointments for this staff on this date
      supabase.from('appointments')
        .select('starts_at, ends_at')
        .eq('staff_id', staffId)
        .eq('organization_id', org.id)
        .in('status', ['confirmed'])
        .gte('starts_at', `${dateStr}T00:00:00`)
        .lte('starts_at', `${dateStr}T23:59:59`),
    ]).then(([scheduleRes, apptRes]) => {
      const schedule = scheduleRes.data
      if (!schedule?.is_working) { setSlots([]); setLoadingSlots(false); return }

      const bookedRanges = (apptRes.data ?? []).map(a => ({
        start: new Date(a.starts_at),
        end: new Date(a.ends_at),
      }))

      const generatedSlots = generateSlots(
        schedule.start_time,
        schedule.end_time,
        selectedService?.duration_minutes ?? 60,
        bookedRanges,
      )
      setSlots(generatedSlots)
      setLoadingSlots(false)
    })
  }, [selectedDate, serviceId, staffId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleWhatsApp() {
    if (!selectedDate || !selectedSlot || !selectedService || !name || !phone) return

    const dateLabel = format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
    const msg = [
      `Hola, me llamo *${name}*.`,
      `Quiero agendar una cita de *${selectedService.name}*`,
      `el *${dateLabel}* a las *${selectedSlot}* hrs${selectedStaff ? ` con *${selectedStaff.name}*` : ''}.`,
      ``,
      `Mi número es: ${phone}`,
      `¿Está disponible?`,
    ].join('\n')

    const waNumber = org.whatsapp_number.replace(/\D/g, '')
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const canGoNext1 = !!serviceId && !!staffId
  const canGoNext2 = !!selectedDate && !!selectedSlot
  const canSubmit  = !!name.trim() && !!phone.trim()

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5">
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors"
                style={step >= s ? { background: accent, color: 'white' } : { background: '#27272a', color: '#71717a' }}
              >
                {s}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: step >= s ? 'white' : '#71717a' }}>
                {s === 1 ? 'Servicio' : s === 2 ? 'Fecha' : 'Datos'}
              </span>
            </div>
            {i < 2 && (
              <div className="flex-1 h-px" style={{ background: step > s ? accent : '#27272a' }} />
            )}
          </div>
        ))}
      </div>
      {/* Step 1 — Servicio y profesional */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Servicio</p>
            <div className="grid gap-2">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => setServiceId(s.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    serviceId === s.id
                      ? 'border-opacity-100 text-white'
                      : 'border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                  style={serviceId === s.id ? { borderColor: accent, background: `${accent}18` } : {}}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{s.name}</span>
                    <span className="text-xs text-zinc-500">
                      {s.duration_minutes} min{s.price ? ` · $${s.price}` : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {staff.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Terapeuta</p>
              <div className="flex flex-wrap gap-2">
                {staff.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStaffId(s.id)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      staffId === s.id ? 'text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                    style={staffId === s.id ? { borderColor: accent, background: `${accent}22`, color: 'white' } : {}}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-select if only one staff */}
          {staff.length === 1 && !staffId && (
            <button className="hidden" onClick={() => setStaffId(staff[0].id)} ref={el => { if (el) el.click() }} />
          )}

          <button
            disabled={!canGoNext1}
            onClick={() => { if (staff.length === 1) setStaffId(staff[0].id); setStep(2) }}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-40 text-white"
            style={{ background: accent }}
          >
            Continuar
          </button>
        </div>
      )}

      {/* Step 2 — Fecha y horario */}
      {step === 2 && (
        <div className="space-y-4">
          <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-4 w-4" />{selectedService?.name}
          </button>

          {/* Date grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Fecha</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWeekOffset(p => Math.max(0, p - 1))}
                  disabled={weekOffset === 0}
                  className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setWeekOffset(p => p + 1)}
                  disabled={(weekOffset + 1) * 7 >= DAYS_AHEAD}
                  className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {visibleDates.map(d => {
                const isSelected = selectedDate && format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => { setSelectedDate(d); setSelectedSlot('') }}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl text-center transition-colors ${
                      isSelected ? 'text-white' : 'border border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                    style={isSelected ? { background: accent } : {}}
                  >
                    <span className="text-[10px] uppercase">{format(d, 'EEE', { locale: es })}</span>
                    <span className="text-sm font-semibold mt-0.5">{format(d, 'd')}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Horario disponible</p>
              {loadingSlots ? (
                <p className="text-sm text-zinc-500">Buscando disponibilidad...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin horarios disponibles para este día. Elige otra fecha.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selectedSlot === slot ? 'text-white' : 'border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                      style={selectedSlot === slot ? { borderColor: accent, background: `${accent}22`, color: 'white' } : {}}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            disabled={!canGoNext2}
            onClick={() => setStep(3)}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-40 text-white"
            style={{ background: accent }}
          >
            Continuar
          </button>
        </div>
      )}

      {/* Step 3 — Datos y confirmación */}
      {step === 3 && (
        <div className="space-y-4">
          <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-4 w-4" />
            {selectedDate && `${format(selectedDate, "EEE d MMM", { locale: es })} a las ${selectedSlot}`}
          </button>

          {/* Resumen */}
          <div className="rounded-xl border border-zinc-800 p-4 space-y-1 text-sm">
            <p className="font-medium">{selectedService?.name}</p>
            <p className="text-zinc-500">
              {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} · {selectedSlot} hrs
              {selectedStaff ? ` · ${selectedStaff.name}` : ''}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1.5">Tu nombre</p>
              <input
                type="text"
                placeholder="Ana García"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1"
                style={{ '--tw-ring-color': accent } as React.CSSProperties}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">Tu WhatsApp</p>
              <input
                type="tel"
                placeholder="+52 55 1234 5678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1"
                style={{ '--tw-ring-color': accent } as React.CSSProperties}
              />
            </div>
          </div>

          <button
            disabled={!canSubmit}
            onClick={handleWhatsApp}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-40 text-white flex items-center justify-center gap-2"
            style={{ background: accent }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            {ctaLabel} por WhatsApp
          </button>

          <p className="text-xs text-zinc-600 text-center">
            Al continuar, abriremos WhatsApp con tu solicitud pre-llenada. La cita se confirma en la conversación.
          </p>
        </div>
      )}
    </div>
  )
}
