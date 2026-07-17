'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Phone, Calendar, AlertTriangle, FileText, TrendingUp,
  Paperclip, CreditCard, ChevronLeft, Plus, Upload, Loader2,
  ClipboardList, Pencil, ExternalLink, Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import Link from 'next/link'
import type { Customer, Appointment, AppointmentNote, TreatmentPlan, Payment, Attachment } from '@/types/database'

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', insurance: 'Seguro', other: 'Otro',
}
const GENDER_LABEL: Record<string, string> = {
  male: 'Masculino', female: 'Femenino', other: 'Otro',
}
const CIVIL_LABEL: Record<string, string> = {
  single: 'Soltero/a', married: 'Casado/a', divorced: 'Divorciado/a', widowed: 'Viudo/a',
}
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada', no_show: 'No asistió',
}
const STATUS_COLOR: Record<string, string> = {
  confirmed: 'bg-blue-500/10 text-blue-400',
  completed: 'bg-emerald-500/10 text-emerald-400',
  cancelled: 'bg-zinc-500/10 text-zinc-400',
  no_show: 'bg-red-500/10 text-red-400',
}

interface Props {
  patient: Customer
  appointments: (Appointment & { staff?: { name: string }; service?: { name: string } })[]
  notes: (AppointmentNote & { appointment?: { starts_at: string }; staff?: { name: string } })[]
  plans: TreatmentPlan[]
  payments: Payment[]
  attachments: Attachment[]
  staff: { id: string; name: string }[]
  organizationId: string
  isMedical: boolean
}

export function PatientDetail({ patient, appointments, notes, plans, payments, attachments, staff, organizationId, isMedical }: Props) {
  const label = isMedical ? 'paciente' : 'cliente'
  const router = useRouter()
  const supabase = createClient()
  const age = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : null

  // ── Edit patient dialog ──────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: patient.name ?? '',
    phone: patient.phone ?? '',
    email: (patient as any).email ?? '',
    date_of_birth: patient.date_of_birth ?? '',
    gender: patient.gender ?? '',
    occupation: patient.occupation ?? '',
    civil_status: (patient as any).civil_status ?? '',
    notes: patient.notes ?? '',
    allergies: patient.allergies ?? '',
    medical_notes: patient.medical_notes ?? '',
    emergency_contact: patient.emergency_contact ?? '',
    emergency_phone: patient.emergency_phone ?? '',
    referring_doctor: (patient as any).referring_doctor ?? '',
    referring_doctor_specialty: (patient as any).referring_doctor_specialty ?? '',
    referring_doctor_phone: (patient as any).referring_doctor_phone ?? '',
    insurance_provider: (patient as any).insurance_provider ?? '',
    insurance_policy: (patient as any).insurance_policy ?? '',
  })
  const [editLoading, setEditLoading] = useState(false)

  async function handleSaveEdit() {
    setEditLoading(true)
    const { error } = await supabase.from('customers').update({
      name: editForm.name || null,
      phone: editForm.phone,
      email: editForm.email || null,
      date_of_birth: editForm.date_of_birth || null,
      gender: editForm.gender || null,
      occupation: editForm.occupation || null,
      civil_status: editForm.civil_status || null,
      notes: editForm.notes || null,
      allergies: editForm.allergies || null,
      medical_notes: editForm.medical_notes || null,
      emergency_contact: editForm.emergency_contact || null,
      emergency_phone: editForm.emergency_phone || null,
      referring_doctor: editForm.referring_doctor || null,
      referring_doctor_specialty: editForm.referring_doctor_specialty || null,
      referring_doctor_phone: editForm.referring_doctor_phone || null,
      insurance_provider: editForm.insurance_provider || null,
      insurance_policy: editForm.insurance_policy || null,
    }).eq('id', patient.id)
    setEditLoading(false)
    if (error) return toast.error(error.message)
    toast.success('Perfil actualizado')
    setEditOpen(false)
    router.refresh()
  }

  // ── SOAP note dialog ─────────────────────────────────────────────────────────
  const [soapOpen, setSoapOpen] = useState(false)
  const [romOpen, setRomOpen] = useState(false)
  const [soapForm, setSoapForm] = useState({
    appointment_id: '', staff_id: '', pain_level: '',
    soap_subjective: '', soap_objective: '', soap_assessment: '', soap_plan: '',
    functional_goals: '', next_session_plan: '',
    // ROM
    rom_cervical: '', rom_shoulder_l: '', rom_shoulder_r: '', rom_lumbar: '',
    rom_hip_l: '', rom_hip_r: '', rom_knee_l: '', rom_knee_r: '',
    rom_ankle_l: '', rom_ankle_r: '', rom_custom: '',
  })

  async function handleAddNote() {
    if (!soapForm.appointment_id) return toast.error('Selecciona la cita')
    const { error } = await supabase.from('appointment_notes').insert({
      organization_id: organizationId,
      appointment_id: soapForm.appointment_id,
      staff_id: soapForm.staff_id || null,
      note_type: 'soap',
      pain_level: soapForm.pain_level ? parseInt(soapForm.pain_level) : null,
      soap_subjective: soapForm.soap_subjective || null,
      soap_objective: soapForm.soap_objective || null,
      soap_assessment: soapForm.soap_assessment || null,
      soap_plan: soapForm.soap_plan || null,
      functional_goals: soapForm.functional_goals || null,
      next_session_plan: soapForm.next_session_plan || null,
      rom_cervical: soapForm.rom_cervical || null,
      rom_shoulder_l: soapForm.rom_shoulder_l || null,
      rom_shoulder_r: soapForm.rom_shoulder_r || null,
      rom_lumbar: soapForm.rom_lumbar || null,
      rom_hip_l: soapForm.rom_hip_l || null,
      rom_hip_r: soapForm.rom_hip_r || null,
      rom_knee_l: soapForm.rom_knee_l || null,
      rom_knee_r: soapForm.rom_knee_r || null,
      rom_ankle_l: soapForm.rom_ankle_l || null,
      rom_ankle_r: soapForm.rom_ankle_r || null,
      rom_custom: soapForm.rom_custom || null,
    })
    if (error) return toast.error(error.message)
    toast.success('Nota SOAP guardada')
    setSoapOpen(false)
    router.refresh()
  }

  // ── File upload ───────────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<string>('other')

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const storagePath = `${organizationId}/${patient.id}/${Date.now()}.${ext}`
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, { upsert: false })
    if (storageError) {
      setUploading(false)
      return toast.error(storageError.message)
    }
    const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(storagePath)
    const { error: dbError } = await supabase.from('attachments').insert({
      organization_id: organizationId,
      customer_id: patient.id,
      name: file.name,
      storage_path: storagePath,
      file_url: urlData.publicUrl,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      category: uploadCategory as 'xray' | 'mri' | 'lab' | 'prescription' | 'referral' | 'other',
    })
    setUploading(false)
    e.target.value = ''
    if (dbError) return toast.error(dbError.message)
    toast.success('Archivo subido')
    router.refresh()
  }

  // ── Portal link ───────────────────────────────────────────────────────────────
  const [sendingPortal, setSendingPortal] = useState(false)
  const [revokingPortal, setRevokingPortal] = useState(false)
  const [hasPortal, setHasPortal] = useState(!!(patient as any).portal_token)

  async function handleSendPortal() {
    setSendingPortal(true)
    // Abrir la pestaña de inmediato (gesto síncrono del click) para que el
    // navegador no la bloquee como popup; la redirigimos cuando llegue la URL.
    const portalTab = window.open('', '_blank')
    const res = await fetch('/api/portal-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: patient.id }),
    })
    const data = await res.json()
    setSendingPortal(false)
    if (!res.ok) {
      portalTab?.close()
      return toast.error(data.error ?? 'Error al generar portal')
    }
    toast.success('Portal enviado por WhatsApp')
    setHasPortal(true)
    if (data.portalUrl) {
      if (portalTab) portalTab.location.href = data.portalUrl
      else window.open(data.portalUrl, '_blank')
      await navigator.clipboard.writeText(data.portalUrl).catch(() => null)
      toast.info('Link copiado al portapapeles')
    } else {
      portalTab?.close()
    }
  }

  async function handleRevokePortal() {
    setRevokingPortal(true)
    const res = await fetch('/api/portal-token', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: patient.id }),
    })
    setRevokingPortal(false)
    if (!res.ok) { toast.error('Error al revocar portal'); return }
    setHasPortal(false)
    toast.success('Acceso al portal revocado')
  }

  // ── Treatment plan CRUD ───────────────────────────────────────────────────────
  const [planOpen, setPlanOpen] = useState(false)
  const [planEditId, setPlanEditId] = useState<string | null>(null)
  const [planForm, setPlanForm] = useState({
    title: '', diagnosis: '', goals: '',
    total_sessions: '', price_per_session: '', staff_id: '', starts_at: '', ends_at: '', notes: '',
  })
  const [plansList, setPlansList] = useState<typeof plans>(plans)

  function openNewPlan() {
    setPlanEditId(null)
    setPlanForm({ title: '', diagnosis: patient.main_diagnosis ?? '', goals: '', total_sessions: '', price_per_session: '', staff_id: staff[0]?.id ?? '', starts_at: new Date().toISOString().slice(0, 10), ends_at: '', notes: '' })
    setPlanOpen(true)
  }

  function openEditPlan(plan: (typeof plans)[0]) {
    setPlanEditId(plan.id)
    setPlanForm({
      title: plan.title,
      diagnosis: plan.diagnosis ?? '',
      goals: plan.goals ?? '',
      total_sessions: plan.total_sessions?.toString() ?? '',
      price_per_session: plan.price_per_session?.toString() ?? '',
      staff_id: plan.staff_id ?? '',
      starts_at: plan.starts_at?.slice(0, 10) ?? '',
      ends_at: plan.ends_at?.slice(0, 10) ?? '',
      notes: plan.notes ?? '',
    })
    setPlanOpen(true)
  }

  async function handleSavePlan() {
    if (!planForm.title.trim()) return toast.error('El título es requerido')
    const payload = {
      organization_id: organizationId,
      customer_id: patient.id,
      title: planForm.title.trim(),
      diagnosis: planForm.diagnosis || null,
      goals: planForm.goals || null,
      total_sessions: planForm.total_sessions ? parseInt(planForm.total_sessions) : null,
      price_per_session: planForm.price_per_session ? parseFloat(planForm.price_per_session) : null,
      staff_id: planForm.staff_id || null,
      starts_at: planForm.starts_at || null,
      ends_at: planForm.ends_at || null,
      notes: planForm.notes || null,
    }
    if (planEditId) {
      const { error } = await supabase.from('treatment_plans').update(payload).eq('id', planEditId)
      if (error) return toast.error(error.message)
      setPlansList(prev => prev.map(p => p.id === planEditId ? { ...p, ...payload } : p))
      toast.success('Plan actualizado')
    } else {
      const { data, error } = await supabase.from('treatment_plans')
        .insert({ ...payload, status: 'active', sessions_done: 0 })
        .select().single()
      if (error) return toast.error(error.message)
      setPlansList(prev => [...prev, data])
      toast.success('Plan creado')
    }
    setPlanOpen(false)
    router.refresh()
  }

  async function handleClosePlan(planId: string) {
    const { error } = await supabase.from('treatment_plans').update({
      status: 'completed',
      ends_at: new Date().toISOString().slice(0, 10),
    }).eq('id', planId)
    if (error) return toast.error(error.message)
    setPlansList(prev => prev.map(p => p.id === planId ? { ...p, status: 'completed' as const, ends_at: new Date().toISOString() } : p))
    toast.success('Plan cerrado')
    router.refresh()
  }

  // ── Payment dialog ───────────────────────────────────────────────────────────
  const [payOpen, setPayOpen] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', concept: '', appointment_id: '' })

  async function handleAddPayment() {
    if (!payForm.amount) return toast.error('Ingresa el monto')
    const { error } = await supabase.from('payments').insert({
      organization_id: organizationId,
      customer_id: patient.id,
      appointment_id: payForm.appointment_id || null,
      amount: parseFloat(payForm.amount),
      method: payForm.method,
      concept: payForm.concept || null,
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    if (error) return toast.error(error.message)
    toast.success('Pago registrado')
    setPayOpen(false)
    router.refresh()
  }

  // ── Evolution data for pain timeline ─────────────────────────────────────────
  const painPoints = notes
    .filter(n => n.pain_level !== null && n.appointment?.starts_at)
    .sort((a, b) => new Date(a.appointment!.starts_at).getTime() - new Date(b.appointment!.starts_at).getTime())

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/patients">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground truncate">{patient.name ?? 'Sin nombre'}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{patient.phone}</span>
            {age !== null && <span>{age} años</span>}
            {patient.allergies && (
              <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />Alergias: {patient.allergies}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMedical && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-violet-400"
                onClick={handleSendPortal}
                disabled={sendingPortal || revokingPortal}
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                {sendingPortal ? 'Enviando…' : 'Portal'}
              </Button>
              {hasPortal && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={handleRevokePortal}
                  disabled={revokingPortal || sendingPortal}
                >
                  {revokingPortal ? 'Revocando…' : 'Revocar acceso'}
                </Button>
              )}
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ficha">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="ficha"><FileText className="h-3.5 w-3.5 mr-1.5" />Ficha</TabsTrigger>
          {isMedical && <TabsTrigger value="planes"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Planes{plansList.filter(p => p.status === 'active').length > 0 && <span className="ml-1.5 bg-violet-500/20 text-violet-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{plansList.filter(p => p.status === 'active').length}</span>}</TabsTrigger>}
          {isMedical && <TabsTrigger value="notas"><FileText className="h-3.5 w-3.5 mr-1.5" />Notas SOAP</TabsTrigger>}
          {isMedical && <TabsTrigger value="evolucion"><TrendingUp className="h-3.5 w-3.5 mr-1.5" />Evolución</TabsTrigger>}
          {isMedical && <TabsTrigger value="archivos"><Paperclip className="h-3.5 w-3.5 mr-1.5" />Archivos</TabsTrigger>}
          <TabsTrigger value="pagos"><CreditCard className="h-3.5 w-3.5 mr-1.5" />Pagos</TabsTrigger>
          <TabsTrigger value="citas"><Calendar className="h-3.5 w-3.5 mr-1.5" />Citas</TabsTrigger>
        </TabsList>

        {/* ── FICHA ── */}
        <TabsContent value="ficha" className="space-y-4 mt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Datos personales</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Nombre" value={patient.name} />
                <Row label="Teléfono" value={patient.phone} />
                <Row label="Correo" value={(patient as any).email} />
                <Row label="Fecha de nac." value={patient.date_of_birth ? format(new Date(patient.date_of_birth), 'd MMM yyyy', { locale: es }) : null} />
                <Row label="Edad" value={age !== null ? `${age} años` : null} />
                <Row label="Género" value={patient.gender} />
                <Row label="Estado civil" value={patient.civil_status} />
                <Row label="Ocupación" value={patient.occupation} />
                <Row label="Tipo de sangre" value={patient.blood_type} />
                <Row label="CURP" value={patient.curp} />
                <Row label="RFC" value={patient.rfc} />
              </CardContent>
            </Card>

            {isMedical && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Datos clínicos</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Diagnóstico principal" value={patient.main_diagnosis} />
                  <Row label="Alergias" value={patient.allergies} warn />
                  <Row label="Antecedentes" value={patient.medical_notes} />
                  <Row label="Médico referente" value={patient.referring_doctor} />
                  <Row label="Especialidad" value={patient.referring_doctor_specialty} />
                  <Row label="Tel. médico" value={patient.referring_doctor_phone} />
                  <Row label="Aseguradora" value={patient.insurance_provider} />
                  <Row label="Póliza" value={patient.insurance_policy} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Contacto de emergencia</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Nombre" value={patient.emergency_contact} />
                <Row label="Teléfono" value={patient.emergency_phone} />
              </CardContent>
            </Card>

            {isMedical && plans.length > 0 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Planes de tratamiento</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {plans.map(plan => (
                    <div key={plan.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{plan.title}</p>
                        <Badge variant="outline" className="text-xs">{plan.status}</Badge>
                      </div>
                      {plan.total_sessions && (
                        <div className="mt-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{plan.sessions_done} de {plan.total_sessions} sesiones</span>
                            {plan.total_sessions - plan.sessions_done <= 2 && (
                              <span className="text-amber-400 font-medium">⚠ Quedan {plan.total_sessions - plan.sessions_done}</span>
                            )}
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-violet-500 rounded-full"
                              style={{ width: `${Math.min(100, (plan.sessions_done / plan.total_sessions) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── PLANES ── */}
        {isMedical && (
          <TabsContent value="planes" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={openNewPlan}>
                <Plus className="h-4 w-4 mr-1.5" />Nuevo plan
              </Button>
            </div>

            {plansList.length === 0 ? (
              <EmptyState text="No hay planes de tratamiento. Crea uno para llevar seguimiento de sesiones." />
            ) : (
              <div className="space-y-3">
                {[...plansList].sort((a, b) => {
                  const order = { active: 0, paused: 1, completed: 2, cancelled: 3 }
                  return (order[a.status] ?? 9) - (order[b.status] ?? 9)
                }).map(plan => {
                  const remaining = plan.total_sessions ? plan.total_sessions - plan.sessions_done : null
                  const isCritical = remaining !== null && remaining <= 2 && plan.status === 'active'
                  const isActive = plan.status === 'active'
                  const pct = plan.total_sessions ? Math.min(100, (plan.sessions_done / plan.total_sessions) * 100) : null
                  return (
                    <Card key={plan.id} className={isCritical ? 'border-amber-500/40' : ''}>
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{plan.title}</p>
                              <PlanStatusBadge status={plan.status} />
                              {isCritical && (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />Quedan {remaining} sesiones
                                </span>
                              )}
                            </div>
                            {plan.diagnosis && <p className="text-xs text-muted-foreground mt-0.5">{plan.diagnosis}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {plan.status === 'completed' && (
                              <Link href={`/patients/${patient.id}/plans/${plan.id}/contrarreferencia`} target="_blank">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-violet-400">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEditPlan(plan)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                                onClick={() => handleClosePlan(plan.id)}
                              >
                                Concluir plan
                              </Button>
                            )}
                          </div>
                        </div>

                        {plan.goals && (
                          <p className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                            <span className="font-medium text-foreground">Objetivos: </span>{plan.goals}
                          </p>
                        )}

                        {plan.total_sessions !== null && (
                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                              <span>{plan.sessions_done} de {plan.total_sessions} sesiones</span>
                              <span>{pct?.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${plan.status === 'completed' ? 'bg-emerald-500' : 'bg-violet-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {plan.price_per_session && plan.sessions_done > 0 && (() => {
                          const totalExpected = plan.price_per_session * plan.sessions_done
                          const totalPaidByPatient = payments
                            .filter(p => p.status === 'paid')
                            .reduce((s, p) => s + Number(p.amount), 0)
                          const sessionsPaid = Math.min(plan.sessions_done, Math.floor(totalPaidByPatient / plan.price_per_session))
                          const sessionsPending = plan.sessions_done - sessionsPaid
                          return (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-emerald-400 font-medium">{sessionsPaid} sesiones cobradas</span>
                              {sessionsPending > 0 && (
                                <span className="text-amber-400 font-medium">· {sessionsPending} pendientes (${(sessionsPending * plan.price_per_session).toLocaleString('es-MX')})</span>
                              )}
                              <span className="text-muted-foreground">· ${plan.price_per_session.toLocaleString('es-MX')}/sesión</span>
                            </div>
                          )
                        })()}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {plan.starts_at && <span>Inicio: {format(new Date(plan.starts_at), 'd MMM yyyy', { locale: es })}</span>}
                          {plan.ends_at && <span>Fin: {format(new Date(plan.ends_at), 'd MMM yyyy', { locale: es })}</span>}
                          {staff.find(s => s.id === plan.staff_id) && (
                            <span>· {staff.find(s => s.id === plan.staff_id)?.name}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── NOTAS SOAP ── */}
        {isMedical && <TabsContent value="notas" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setSoapOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Nueva nota SOAP
            </Button>
          </div>

          {notes.length === 0 ? (
            <EmptyState text="No hay notas clínicas todavía." />
          ) : (
            <div className="space-y-3">
              {notes.map(note => (
                <Card key={note.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {note.appointment?.starts_at
                            ? format(new Date(note.appointment.starts_at), 'd MMM yyyy', { locale: es })
                            : format(new Date(note.created_at), 'd MMM yyyy', { locale: es })}
                        </span>
                        {note.staff && <span className="text-xs text-muted-foreground">· {note.staff.name}</span>}
                      </div>
                      {note.pain_level !== null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Dolor</span>
                          <PainBadge level={note.pain_level} />
                        </div>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      {note.soap_subjective && <SoapField label="S — Subjetivo" value={note.soap_subjective} />}
                      {note.soap_objective && <SoapField label="O — Objetivo" value={note.soap_objective} />}
                      {note.soap_assessment && <SoapField label="A — Análisis" value={note.soap_assessment} />}
                      {note.soap_plan && <SoapField label="P — Plan" value={note.soap_plan} />}
                    </div>

                    {note.next_session_plan && (
                      <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-1">
                        <span className="font-medium">Próxima sesión: </span>{note.next_session_plan}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>}

        {/* ── EVOLUCIÓN ── */}
        {isMedical && <TabsContent value="evolucion" className="space-y-4 mt-4">
          {painPoints.length === 0 ? (
            <EmptyState text="Agrega notas SOAP con nivel de dolor para ver la línea de tiempo." />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Línea de tiempo — Nivel de dolor</CardTitle></CardHeader>
              <CardContent>
                <PainChart points={painPoints} />
                <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-border">
                  <Stat label="Inicio" value={`${painPoints[0]?.pain_level ?? '—'}/10`} />
                  <Stat label="Actual" value={`${painPoints[painPoints.length - 1]?.pain_level ?? '—'}/10`} />
                  <Stat
                    label="Mejora"
                    value={painPoints.length >= 2
                      ? `${painPoints[0].pain_level! - painPoints[painPoints.length - 1].pain_level!} pts`
                      : '—'}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session list */}
          <div className="space-y-2">
            {notes.map((n, i) => (
              <div key={n.id} className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {notes.length - i}
                </div>
                <div className="flex-1 border-b border-border pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {n.appointment?.starts_at
                        ? format(new Date(n.appointment.starts_at), 'd MMM yyyy', { locale: es })
                        : format(new Date(n.created_at), 'd MMM yyyy', { locale: es })}
                    </span>
                    {n.pain_level !== null && <PainBadge level={n.pain_level} />}
                  </div>
                  {n.soap_assessment && <p className="text-muted-foreground text-xs mt-0.5">{n.soap_assessment}</p>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>}

        {/* ── ARCHIVOS ── */}
        {isMedical && <TabsContent value="archivos" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select value={uploadCategory} onValueChange={v => v && setUploadCategory(v)}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue>{CATEGORY_LABEL[uploadCategory] ?? uploadCategory}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xray">Radiografía</SelectItem>
                <SelectItem value="mri">Resonancia</SelectItem>
                <SelectItem value="lab">Laboratorio</SelectItem>
                <SelectItem value="prescription">Receta</SelectItem>
                <SelectItem value="referral">Referencia</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
            <label className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border border-border bg-background hover:bg-muted/40 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Subiendo…</>
                : <><Upload className="h-4 w-4" />Subir archivo</>
              }
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>

          {attachments.length === 0 ? (
            <EmptyState text="No hay archivos adjuntos. Sube radiografías, resonancias o estudios con el botón de arriba." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {attachments.map(a => (
                <a
                  key={a.id}
                  href={a.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {CATEGORY_LABEL[a.category] ?? a.category} · {format(new Date(a.created_at), 'd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </TabsContent>}

        {/* ── PAGOS ── */}
        <TabsContent value="pagos" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Pagado</p>
                <p className="text-lg font-semibold text-emerald-400">${totalPaid.toFixed(2)}</p>
              </div>
              {totalPending > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                  <p className="text-lg font-semibold text-amber-400">${totalPending.toFixed(2)}</p>
                </div>
              )}
            </div>
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Registrar pago
            </Button>
          </div>

          {payments.length === 0 ? (
            <EmptyState text="No hay pagos registrados." />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Concepto</th>
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Método</th>
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Fecha</th>
                    <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">{p.concept ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{METHOD_LABEL[p.method]}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {p.paid_at ? format(new Date(p.paid_at), 'd MMM yyyy', { locale: es }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={p.status === 'pending' ? 'text-amber-400' : ''}>
                          ${Number(p.amount).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── CITAS ── */}
        <TabsContent value="citas" className="space-y-3 mt-4">
          {appointments.length === 0 ? (
            <EmptyState text={`Este ${label} no tiene citas registradas.`} />
          ) : (
            appointments.map(a => (
              <div key={a.id} className="flex items-center justify-between py-3 px-4 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(a.starts_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.service?.name ?? '—'} · {a.staff?.name ?? '—'}
                  </p>
                </div>
                <Badge variant="outline" className={`text-xs ${STATUS_COLOR[a.status]}`}>
                  {STATUS_LABEL[a.status]}
                </Badge>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Patient Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar {label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">

            {/* Datos personales */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Datos personales</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Nombre</Label>
                  <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre completo" />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="521XXXXXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label>Correo electrónico</Label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="paciente@correo.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de nacimiento</Label>
                  <Input type="date" value={editForm.date_of_birth} onChange={e => setEditForm(p => ({ ...p, date_of_birth: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Género</Label>
                  <Select value={editForm.gender} onValueChange={v => setEditForm(p => ({ ...p, gender: v ?? '' }))}>
                    <SelectTrigger><SelectValue placeholder="Selecciona">{editForm.gender ? GENDER_LABEL[editForm.gender] : undefined}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ocupación</Label>
                  <Input value={editForm.occupation} onChange={e => setEditForm(p => ({ ...p, occupation: e.target.value }))} placeholder="Ingeniero, maestro..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado civil</Label>
                  <Select value={editForm.civil_status} onValueChange={v => setEditForm(p => ({ ...p, civil_status: v ?? '' }))}>
                    <SelectTrigger><SelectValue placeholder="Selecciona">{editForm.civil_status ? CIVIL_LABEL[editForm.civil_status] : undefined}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Soltero/a</SelectItem>
                      <SelectItem value="married">Casado/a</SelectItem>
                      <SelectItem value="divorced">Divorciado/a</SelectItem>
                      <SelectItem value="widowed">Viudo/a</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Notas generales</Label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editForm.notes}
                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Preferencias, observaciones..."
                  />
                </div>
              </div>
            </div>

            {/* Datos clínicos */}
            {isMedical && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Datos clínicos</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Alergias</Label>
                    <Input value={editForm.allergies} onChange={e => setEditForm(p => ({ ...p, allergies: e.target.value }))} placeholder="Penicilina, látex..." />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Antecedentes médicos</Label>
                    <textarea
                      className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      value={editForm.medical_notes}
                      onChange={e => setEditForm(p => ({ ...p, medical_notes: e.target.value }))}
                      placeholder="Diabetes, hipertensión, cirugías previas..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Médico referente</Label>
                    <Input value={editForm.referring_doctor} onChange={e => setEditForm(p => ({ ...p, referring_doctor: e.target.value }))} placeholder="Dr. Martínez" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Especialidad</Label>
                    <Input value={editForm.referring_doctor_specialty} onChange={e => setEditForm(p => ({ ...p, referring_doctor_specialty: e.target.value }))} placeholder="Traumatología" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tel. médico</Label>
                    <Input value={editForm.referring_doctor_phone} onChange={e => setEditForm(p => ({ ...p, referring_doctor_phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Aseguradora</Label>
                    <Input value={editForm.insurance_provider} onChange={e => setEditForm(p => ({ ...p, insurance_provider: e.target.value }))} placeholder="IMSS, GNP..." />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Número de póliza</Label>
                    <Input value={editForm.insurance_policy} onChange={e => setEditForm(p => ({ ...p, insurance_policy: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}

            {/* Contacto de emergencia */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contacto de emergencia</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <Input value={editForm.emergency_contact} onChange={e => setEditForm(p => ({ ...p, emergency_contact: e.target.value }))} placeholder="María García" />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input value={editForm.emergency_phone} onChange={e => setEditForm(p => ({ ...p, emergency_phone: e.target.value }))} placeholder="3141234567" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SOAP Dialog */}
      <Dialog open={soapOpen} onOpenChange={setSoapOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva nota SOAP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cita</Label>
                <Select value={soapForm.appointment_id} onValueChange={v => setSoapForm(p => ({ ...p, appointment_id: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona">{soapForm.appointment_id ? format(new Date(appointments.find(a => a.id === soapForm.appointment_id)?.starts_at ?? ''), 'd MMM yyyy HH:mm', { locale: es }) : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {appointments.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {format(new Date(a.starts_at), 'd MMM yyyy HH:mm', { locale: es })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nivel de dolor (0–10)</Label>
                <Input
                  type="number" min={0} max={10}
                  placeholder="5"
                  value={soapForm.pain_level}
                  onChange={e => setSoapForm(p => ({ ...p, pain_level: e.target.value }))}
                />
              </div>
            </div>

            {(['soap_subjective', 'soap_objective', 'soap_assessment', 'soap_plan'] as const).map((field, i) => (
              <div key={field} className="space-y-2">
                <Label>{[`S — Subjetivo (lo que reporta el ${label})`, 'O — Objetivo (lo que observa el terapeuta)', 'A — Análisis / Diagnóstico', 'P — Plan'][i]}</Label>
                <textarea
                  className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  value={soapForm[field]}
                  onChange={e => setSoapForm(p => ({ ...p, [field]: e.target.value }))}
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label>Plan próxima sesión</Label>
              <Input
                placeholder="Ejercicios de fortalecimiento, ultrasonido..."
                value={soapForm.next_session_plan}
                onChange={e => setSoapForm(p => ({ ...p, next_session_plan: e.target.value }))}
              />
            </div>

            {/* ROM colapsable */}
            <div>
              <button
                type="button"
                onClick={() => setRomOpen(p => !p)}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider w-full py-1"
              >
                <span className="flex-1 h-px bg-border" />
                Rango de movimiento (ROM)
                <span className="flex-1 h-px bg-border" />
                <span className="text-[10px]">{romOpen ? '▲' : '▼'}</span>
              </button>
              {romOpen && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {ROM_FIELDS.map(f => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs">{f.label}</Label>
                      <Input
                        className="h-8 text-sm"
                        placeholder={f.placeholder}
                        value={soapForm[f.key as keyof typeof soapForm]}
                        onChange={e => setSoapForm(p => ({ ...p, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Otras articulaciones</Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Codo D: Flex 120°…"
                      value={soapForm.rom_custom}
                      onChange={e => setSoapForm(p => ({ ...p, rom_custom: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSoapOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddNote}>Guardar nota</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{planEditId ? 'Editar plan' : 'Nuevo plan de tratamiento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Rehabilitación lumbar, Recuperación post-fractura…"
                value={planForm.title}
                onChange={e => setPlanForm(p => ({ ...p, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Diagnóstico (CIE-10 o texto libre)</Label>
              <Input
                placeholder="M54.5 Lumbalgia crónica"
                value={planForm.diagnosis}
                onChange={e => setPlanForm(p => ({ ...p, diagnosis: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Objetivos funcionales</Label>
              <textarea
                className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Recuperar 80% de movilidad lumbar, reducir dolor a ≤3/10…"
                value={planForm.goals}
                onChange={e => setPlanForm(p => ({ ...p, goals: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total de sesiones</Label>
                <Input
                  type="number" min={1} max={200}
                  placeholder="10"
                  value={planForm.total_sessions}
                  onChange={e => setPlanForm(p => ({ ...p, total_sessions: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio por sesión ($)</Label>
                <Input
                  type="number" min={0}
                  placeholder="500"
                  value={planForm.price_per_session}
                  onChange={e => setPlanForm(p => ({ ...p, price_per_session: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Terapeuta responsable</Label>
                <Select value={planForm.staff_id} onValueChange={v => setPlanForm(p => ({ ...p, staff_id: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona">{planForm.staff_id ? (staff.find(s => s.id === planForm.staff_id)?.name) : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input type="date" value={planForm.starts_at} onChange={e => setPlanForm(p => ({ ...p, starts_at: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin estimada</Label>
                <Input type="date" value={planForm.ends_at} onChange={e => setPlanForm(p => ({ ...p, ends_at: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas del plan</Label>
              <Input
                placeholder="Precauciones, contraindicaciones…"
                value={planForm.notes}
                onChange={e => setPlanForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePlan}>
              {planEditId ? 'Actualizar plan' : 'Crear plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto (MXN)</Label>
                <Input type="number" placeholder="500" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <Select value={payForm.method} onValueChange={v => setPayForm(p => ({ ...p, method: v ?? 'cash' }))}>
                  <SelectTrigger><SelectValue>{METHOD_LABEL[payForm.method] ?? payForm.method}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {Object.entries(METHOD_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Concepto (opcional)</Label>
              <Input placeholder="Sesión 3 de 10, Evaluación inicial..." value={payForm.concept} onChange={e => setPayForm(p => ({ ...p, concept: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddPayment}>Guardar pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  xray: 'Radiografía', mri: 'Resonancia', lab: 'Laboratorio',
  prescription: 'Receta', referral: 'Referencia', other: 'Otro',
}

const ROM_FIELDS = [
  { key: 'rom_cervical',   label: 'Cervical',       placeholder: 'Flex 45°, Ext 35°' },
  { key: 'rom_lumbar',     label: 'Lumbar',          placeholder: 'Flex 60°, Ext 20°' },
  { key: 'rom_shoulder_l', label: 'Hombro Izq',      placeholder: 'Flex 170°, Abd 160°' },
  { key: 'rom_shoulder_r', label: 'Hombro Der',      placeholder: 'Flex 170°, Abd 160°' },
  { key: 'rom_hip_l',      label: 'Cadera Izq',      placeholder: 'Flex 110°, Ext 20°' },
  { key: 'rom_hip_r',      label: 'Cadera Der',      placeholder: 'Flex 110°, Ext 20°' },
  { key: 'rom_knee_l',     label: 'Rodilla Izq',     placeholder: 'Flex 130°, Ext 0°' },
  { key: 'rom_knee_r',     label: 'Rodilla Der',     placeholder: 'Flex 130°, Ext 0°' },
  { key: 'rom_ankle_l',    label: 'Tobillo Izq',     placeholder: 'Flex 20°, Ext 40°' },
  { key: 'rom_ankle_r',    label: 'Tobillo Der',     placeholder: 'Flex 20°, Ext 40°' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function PainChart({ points }: { points: { id: string; pain_level: number | null; appointment?: { starts_at: string } | null }[] }) {
  const W = 560
  const H = 140
  const PAD = { top: 20, right: 12, bottom: 28, left: 28 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const n = points.length
  const barW = Math.min(36, (chartW / n) - 6)
  const barColor = (v: number) => v <= 3 ? '#34d399' : v <= 6 ? '#fbbf24' : '#f87171'

  const gridLines = [0, 2, 4, 6, 8, 10]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
      {/* grid lines */}
      {gridLines.map(v => {
        const y = PAD.top + chartH - (v / 10) * chartH
        return (
          <g key={v}>
            <line x1={PAD.left} x2={PAD.left + chartW} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
            <text x={PAD.left - 5} y={y + 3.5} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.4}>{v}</text>
          </g>
        )
      })}

      {/* line connecting tops */}
      {points.length > 1 && (
        <polyline
          fill="none"
          stroke="#a78bfa"
          strokeWidth={1.5}
          strokeDasharray="3 2"
          opacity={0.5}
          points={points.map((p, i) => {
            const x = PAD.left + (i / (n - 1)) * chartW
            const y = PAD.top + chartH - ((p.pain_level ?? 0) / 10) * chartH
            return `${x},${y}`
          }).join(' ')}
        />
      )}

      {/* bars */}
      {points.map((p, i) => {
        const x = PAD.left + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW)
        const barH = Math.max(3, ((p.pain_level ?? 0) / 10) * chartH)
        const y = PAD.top + chartH - barH
        const date = p.appointment?.starts_at
          ? format(new Date(p.appointment.starts_at), 'd/M', { locale: es })
          : ''
        return (
          <g key={i}>
            <rect
              x={x - barW / 2} y={y}
              width={barW} height={barH}
              rx={3}
              fill={barColor(p.pain_level ?? 0)}
              opacity={0.85}
            />
            <text x={x} y={y - 5} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.7} fontWeight={600}>
              {p.pain_level}
            </text>
            <text x={x} y={PAD.top + chartH + 14} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.45}>
              {date}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Row({ label, value, warn }: { label: string; value: string | null | undefined; warn?: boolean }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right ${warn ? 'text-amber-400 font-medium' : 'text-foreground'}`}>{value}</span>
    </div>
  )
}

function SoapField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-foreground leading-relaxed">{value}</p>
    </div>
  )
}

function PainBadge({ level }: { level: number }) {
  const color = level <= 3 ? 'text-emerald-400 bg-emerald-500/10' : level <= 6 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{level}/10</span>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function PlanStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    active: 'text-emerald-400 bg-emerald-500/10',
    paused: 'text-amber-400 bg-amber-500/10',
    completed: 'text-blue-400 bg-blue-500/10',
    cancelled: 'text-zinc-400 bg-zinc-500/10',
  }
  const label: Record<string, string> = {
    active: 'Activo', paused: 'Pausado', completed: 'Completado', cancelled: 'Cancelado',
  }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg[status] ?? ''}`}>{label[status] ?? status}</span>
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground text-sm">{text}</CardContent>
    </Card>
  )
}
