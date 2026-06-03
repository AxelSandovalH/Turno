'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Phone, Calendar, AlertTriangle, FileText, TrendingUp,
  Paperclip, CreditCard, ChevronLeft, Plus, Pencil, Check, X,
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

  // ── SOAP note dialog ─────────────────────────────────────────────────────────
  const [soapOpen, setSoapOpen] = useState(false)
  const [soapForm, setSoapForm] = useState({
    appointment_id: '', staff_id: '', pain_level: '',
    soap_subjective: '', soap_objective: '', soap_assessment: '', soap_plan: '',
    functional_goals: '', next_session_plan: '',
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
    })
    if (error) return toast.error(error.message)
    toast.success('Nota SOAP guardada')
    setSoapOpen(false)
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
      </div>

      <Tabs defaultValue="ficha">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="ficha"><FileText className="h-3.5 w-3.5 mr-1.5" />Ficha</TabsTrigger>
          <TabsTrigger value="notas"><FileText className="h-3.5 w-3.5 mr-1.5" />Notas SOAP</TabsTrigger>
          <TabsTrigger value="evolucion"><TrendingUp className="h-3.5 w-3.5 mr-1.5" />Evolución</TabsTrigger>
          <TabsTrigger value="archivos"><Paperclip className="h-3.5 w-3.5 mr-1.5" />Archivos</TabsTrigger>
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
                <Row label="Fecha de nac." value={patient.date_of_birth ? format(new Date(patient.date_of_birth), 'd MMM yyyy', { locale: es }) : null} />
                <Row label="Edad" value={age !== null ? `${age} años` : null} />
                <Row label="Género" value={patient.gender} />
                <Row label="Estado civil" value={patient.civil_status} />
                <Row label="Ocupación" value={patient.occupation} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Datos clínicos</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Alergias" value={patient.allergies} warn />
                <Row label="Antecedentes" value={patient.medical_notes} />
                <Row label="Médico referente" value={patient.referring_doctor} />
                <Row label="Especialidad" value={patient.referring_doctor_specialty} />
                <Row label="Tel. médico" value={patient.referring_doctor_phone} />
                <Row label="Aseguradora" value={patient.insurance_provider} />
                <Row label="Póliza" value={patient.insurance_policy} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Contacto de emergencia</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Nombre" value={patient.emergency_contact} />
                <Row label="Teléfono" value={patient.emergency_phone} />
              </CardContent>
            </Card>

            {plans.length > 0 && (
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

        {/* ── NOTAS SOAP ── */}
        <TabsContent value="notas" className="space-y-4 mt-4">
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
        </TabsContent>

        {/* ── EVOLUCIÓN ── */}
        <TabsContent value="evolucion" className="space-y-4 mt-4">
          {painPoints.length === 0 ? (
            <EmptyState text="Agrega notas SOAP con nivel de dolor para ver la línea de tiempo." />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Línea de tiempo — Nivel de dolor</CardTitle></CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Chart */}
                  <div className="flex items-end gap-2 h-32 border-b border-border pb-2">
                    {painPoints.map((n, i) => (
                      <div key={n.id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <span className="text-[10px] text-muted-foreground">{n.pain_level}</span>
                        <div
                          className="w-full rounded-t-sm"
                          style={{
                            height: `${(n.pain_level! / 10) * 100}%`,
                            background: n.pain_level! <= 3
                              ? 'rgb(52 211 153)' : n.pain_level! <= 6
                              ? 'rgb(251 191 36)' : 'rgb(248 113 113)',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {painPoints.map(n => (
                      <div key={n.id} className="flex-1 min-w-0">
                        <p className="text-[9px] text-muted-foreground text-center truncate">
                          {format(new Date(n.appointment!.starts_at), 'd/M', { locale: es })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-border">
                  <Stat label="Inicio" value={`${painPoints[0]?.pain_level ?? '—'}/10`} />
                  <Stat label="Actual" value={`${painPoints[painPoints.length - 1]?.pain_level ?? '—'}/10`} />
                  <Stat
                    label="Mejora"
                    value={painPoints.length >= 2
                      ? `${(painPoints[0].pain_level! - painPoints[painPoints.length - 1].pain_level!)} pts`
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
        </TabsContent>

        {/* ── ARCHIVOS ── */}
        <TabsContent value="archivos" className="space-y-4 mt-4">
          {attachments.length === 0 ? (
            <EmptyState text="No hay archivos adjuntos. Próximamente podrás subir radiografías, resonancias y estudios." />
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
                    <p className="text-xs text-muted-foreground">{a.category} · {format(new Date(a.created_at), 'd MMM yyyy', { locale: es })}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </TabsContent>

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
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSoapOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddNote}>Guardar nota</Button>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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

// ── Sub-components ────────────────────────────────────────────────────────────

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

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground text-sm">{text}</CardContent>
    </Card>
  )
}
