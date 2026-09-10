'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Service { id: string; name: string; duration_minutes: number; price: number | null; description: string | null }
interface Staff { id: string; name: string }

interface Props {
  org: { id: string; name: string; whatsapp_number: string; slug: string }
  services: Service[]
  staff: Staff[]
  accent: string
  ctaLabel: string
}

const DAYS_AHEAD = 14

export function BookingForm({ org, services, staff, accent, ctaLabel }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const selectedService = services.find(s => s.id === serviceId)
  const selectedStaff   = staff.find(s => s.id === staffId)

  // Available dates grid (14 days from today)
  const today = startOfDay(new Date())
  const dates = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i + 1))
  const visibleDates = dates.slice(weekOffset * 7, weekOffset * 7 + 7)

  // Fetch slots when date + service + staff selected — server-side calculation
  // (respects time blocks, org timezone, and never exposes appointment data)
  useEffect(() => {
    if (!selectedDate || !serviceId || !staffId) { setSlots([]); return }

    setLoadingSlots(true)
    setSelectedSlot('')

    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const params = new URLSearchParams({ slug: org.slug, staff: staffId, service: serviceId, date: dateStr })
    let cancelled = false

    fetch(`/api/booking/slots?${params}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setSlots(data.slots ?? [])
        setLoadingSlots(false)
      })
      .catch(() => {
        if (cancelled) return
        setSlots([])
        setLoadingSlots(false)
      })

    return () => { cancelled = true }
  }, [selectedDate, serviceId, staffId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirm() {
    if (!selectedDate || !selectedSlot || !serviceId || !staffId || !name.trim() || !phone.trim()) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: org.slug,
          service_id: serviceId,
          staff_id: staffId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          slot: selectedSlot,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setSubmitError(data?.error ?? 'No se pudo agendar tu cita. Intenta de nuevo.')
        setSubmitting(false)
        return
      }
      if (data.requiresPayment && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setStep(4)
    } catch {
      setSubmitError('No se pudo conectar con el servidor. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  const canGoNext1 = !!serviceId && !!staffId
  const canGoNext2 = !!selectedDate && !!selectedSlot
  const canSubmit  = !!name.trim() && !!phone.trim() && !submitting

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      {step !== 4 && (
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
      )}
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
                  {serviceId === s.id && s.description && (
                    <p className="mt-1.5 text-xs text-zinc-400">{s.description}</p>
                  )}
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

          {submitError && (
            <p className="text-sm text-red-400 text-center">{submitError}</p>
          )}

          <button
            disabled={!canSubmit}
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-40 text-white flex items-center justify-center gap-2"
            style={{ background: accent }}
          >
            {submitting ? 'Agendando...' : ctaLabel}
          </button>

          <p className="text-xs text-zinc-600 text-center">
            Tu cita queda confirmada al instante. Te avisamos por WhatsApp.
          </p>
        </div>
      )}

      {/* Step 4 — Confirmación */}
      {step === 4 && (
        <div className="space-y-4 text-center py-6">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background: `${accent}22`, color: accent }}
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">¡Cita confirmada!</p>
            <p className="text-sm text-zinc-400 mt-1">
              {selectedService?.name} · {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} a las {selectedSlot}
              {selectedStaff ? ` · ${selectedStaff.name}` : ''}
            </p>
          </div>
          <p className="text-xs text-zinc-600">
            Te mandamos la confirmación por WhatsApp al {phone}.
          </p>
        </div>
      )}
    </div>
  )
}
