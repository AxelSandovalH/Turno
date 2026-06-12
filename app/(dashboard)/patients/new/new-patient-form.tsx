'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Check, User, Stethoscope, UserRound, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Props {
  organizationId: string
  isMedical: boolean
}

type Step = 1 | 2 | 3 | 4

const STEPS = [
  { id: 1, label: 'Personales', icon: User },
  { id: 2, label: 'Clínicos', icon: Stethoscope },
  { id: 3, label: 'Referente', icon: UserRound },
  { id: 4, label: 'Emergencia', icon: Phone },
] as const

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const CIVIL_STATUSES = [
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'casado', label: 'Casado/a' },
  { value: 'divorciado', label: 'Divorciado/a' },
  { value: 'viudo', label: 'Viudo/a' },
  { value: 'union_libre', label: 'Unión libre' },
]

export function NewPatientForm({ organizationId, isMedical }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    // Step 1 — Personales
    name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    civil_status: '',
    occupation: '',
    curp: '',
    rfc: '',
    blood_type: '',
    // Step 2 — Clínicos
    main_diagnosis: '',
    allergies: '',
    medical_notes: '',
    insurance_provider: '',
    insurance_policy: '',
    // Step 3 — Médico referente
    referring_doctor: '',
    referring_doctor_specialty: '',
    referring_doctor_phone: '',
    // Step 4 — Contacto emergencia
    emergency_contact: '',
    emergency_phone: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  function canProceed(): boolean {
    if (step === 1) return !!form.name.trim() && !!form.phone.trim()
    return true
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Nombre y teléfono son requeridos')
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from('customers').insert({
      organization_id: organizationId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      date_of_birth: form.date_of_birth || null,
      gender: (form.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say') || null,
      civil_status: form.civil_status || null,
      occupation: form.occupation || null,
      curp: form.curp || null,
      rfc: form.rfc || null,
      blood_type: form.blood_type || null,
      main_diagnosis: form.main_diagnosis || null,
      allergies: form.allergies || null,
      medical_notes: form.medical_notes || null,
      insurance_provider: form.insurance_provider || null,
      insurance_policy: form.insurance_policy || null,
      referring_doctor: form.referring_doctor || null,
      referring_doctor_specialty: form.referring_doctor_specialty || null,
      referring_doctor_phone: form.referring_doctor_phone || null,
      emergency_contact: form.emergency_contact || null,
      emergency_phone: form.emergency_phone || null,
    }).select('id').single()
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Paciente registrado')
    router.push(`/patients/${data.id}`)
  }

  const label = isMedical ? 'paciente' : 'cliente'

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Nuevo {label}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paso {step} de {isMedical ? 4 : 1}
        </p>
      </div>

      {/* Step indicator (only medical) */}
      {isMedical && (
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = step > s.id
            const active = step === s.id
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => done && setStep(s.id as Step)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    active ? 'text-foreground' : done ? 'text-violet-400 cursor-pointer' : 'text-muted-foreground/50'
                  }`}
                >
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full border transition-colors ${
                    active ? 'border-foreground bg-foreground text-background' :
                    done ? 'border-violet-500 bg-violet-500/20 text-violet-400' :
                    'border-border'
                  }`}>
                    {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 transition-colors ${done ? 'bg-violet-500/40' : 'bg-border'}`} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Step 1 — Datos personales */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nombre completo *">
              <Input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Ana García López"
                autoFocus
              />
            </Field>
            <Field label="Teléfono (WhatsApp) *">
              <Input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+52 55 1234 5678"
                type="tel"
              />
            </Field>
          </div>

          {isMedical && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Fecha de nacimiento">
                  <Input
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => set('date_of_birth', e.target.value)}
                  />
                </Field>
                <Field label="Género">
                  <Select value={form.gender} onValueChange={v => v && set('gender', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefiero no decir</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Estado civil">
                  <Select value={form.civil_status} onValueChange={v => v && set('civil_status', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                    <SelectContent>
                      {CIVIL_STATUSES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Ocupación">
                  <Input
                    value={form.occupation}
                    onChange={e => set('occupation', e.target.value)}
                    placeholder="Maestro, empleado, estudiante…"
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Tipo de sangre">
                  <Select value={form.blood_type} onValueChange={v => v && set('blood_type', v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {BLOOD_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="CURP">
                  <Input
                    value={form.curp}
                    onChange={e => set('curp', e.target.value.toUpperCase())}
                    placeholder="XXXX000000XXXXXX00"
                    maxLength={18}
                  />
                </Field>
                <Field label="RFC">
                  <Input
                    value={form.rfc}
                    onChange={e => set('rfc', e.target.value.toUpperCase())}
                    placeholder="XXXX000000XXX"
                    maxLength={13}
                  />
                </Field>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2 — Datos clínicos */}
      {step === 2 && (
        <div className="space-y-4">
          <Field label="Diagnóstico principal (CIE-10 o texto libre)">
            <Input
              value={form.main_diagnosis}
              onChange={e => set('main_diagnosis', e.target.value)}
              placeholder="M54.5 Lumbalgia, Esguince tobillo, Fractura…"
              autoFocus
            />
          </Field>
          <Field label="Alergias">
            <Input
              value={form.allergies}
              onChange={e => set('allergies', e.target.value)}
              placeholder="Penicilina, AINEs, látex… (separadas por coma)"
            />
          </Field>
          <Field label="Antecedentes médicos relevantes">
            <Textarea
              value={form.medical_notes}
              onChange={e => set('medical_notes', e.target.value)}
              placeholder="Cirugías previas, enfermedades crónicas, medicamentos actuales…"
              className="min-h-[90px] resize-none"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Aseguradora">
              <Input
                value={form.insurance_provider}
                onChange={e => set('insurance_provider', e.target.value)}
                placeholder="IMSS, ISSSTE, GNP, AXA…"
              />
            </Field>
            <Field label="Número de póliza">
              <Input
                value={form.insurance_policy}
                onChange={e => set('insurance_policy', e.target.value)}
                placeholder="POL-123456"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Step 3 — Médico referente */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Médico que envió al paciente (ortopeda, traumatólogo, neurólogo, etc.). Opcional.
          </p>
          <Field label="Nombre del médico referente">
            <Input
              value={form.referring_doctor}
              onChange={e => set('referring_doctor', e.target.value)}
              placeholder="Dr. José Martínez"
              autoFocus
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Especialidad">
              <Input
                value={form.referring_doctor_specialty}
                onChange={e => set('referring_doctor_specialty', e.target.value)}
                placeholder="Ortopedia y traumatología"
              />
            </Field>
            <Field label="Teléfono / Consultorio">
              <Input
                value={form.referring_doctor_phone}
                onChange={e => set('referring_doctor_phone', e.target.value)}
                placeholder="+52 55 1234 5678"
                type="tel"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Step 4 — Contacto de emergencia */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Persona a contactar en caso de urgencia. Opcional pero recomendado.
          </p>
          <Field label="Nombre del contacto">
            <Input
              value={form.emergency_contact}
              onChange={e => set('emergency_contact', e.target.value)}
              placeholder="María López (esposa)"
              autoFocus
            />
          </Field>
          <Field label="Teléfono">
            <Input
              value={form.emergency_phone}
              onChange={e => set('emergency_phone', e.target.value)}
              placeholder="+52 55 9876 5432"
              type="tel"
            />
          </Field>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          onClick={() => step > 1 ? setStep((step - 1) as Step) : router.push('/patients')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 1 ? 'Cancelar' : 'Atrás'}
        </Button>

        {(!isMedical || step === 4) ? (
          <Button onClick={handleSubmit} disabled={saving || !canProceed()}>
            {saving ? 'Guardando…' : `Guardar ${label}`}
          </Button>
        ) : (
          <Button onClick={() => setStep((step + 1) as Step)} disabled={!canProceed()}>
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}
