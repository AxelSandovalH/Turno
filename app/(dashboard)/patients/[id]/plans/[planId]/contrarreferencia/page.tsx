import { notFound } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { differenceInYears } from 'date-fns'
import { PrintButton } from './print-button'

interface Props {
  params: Promise<{ id: string; planId: string }>
}

export default async function ContrarreferenciаPage({ params }: Props) {
  const { id: patientId, planId } = await params
  const { organization } = await requireOrganization()
  const db = createServiceClient()

  const [
    { data: patient },
    { data: plan },
    { data: org },
  ] = await Promise.all([
    db.from('customers').select('*').eq('id', patientId).eq('organization_id', organization.id).single(),
    db.from('treatment_plans').select('*, staff(name)').eq('id', planId).eq('organization_id', organization.id).single(),
    db.from('organizations').select('name, address, phone').eq('id', organization.id).single(),
  ])

  if (!patient || !plan) notFound()

  // SOAP notes for appointments linked to this patient, ordered chronologically
  const apptIds = (await db.from('appointments').select('id').eq('customer_id', patientId).eq('organization_id', organization.id)).data?.map(a => a.id) ?? []

  const { data: notes } = await db
    .from('appointment_notes')
    .select('*, appointment:appointments(starts_at, service:services(name)), staff(name)')
    .in('appointment_id', apptIds)
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: true })

  const age = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : null
  const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })
  const staffName = (plan as unknown as { staff?: { name: string } }).staff?.name ?? '—'

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      {/* Print controls — hidden when printing */}
      <div className="print:hidden flex items-center justify-between px-6 py-3 bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
        <p className="text-sm text-zinc-500">Vista previa — Nota de contrarreferencia</p>
        <PrintButton />
      </div>

      {/* Print-only top bar */}
      <div className="hidden print:flex items-center justify-between px-8 py-3 border-b border-zinc-300 text-xs text-zinc-500">
        <span>{today}</span>
        <span className="font-semibold tracking-wide">Turno — Recepcionista digital</span>
      </div>

      <div className="max-w-[720px] mx-auto px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide">Nota de Contrarreferencia</h1>
            <p className="text-sm text-zinc-500 mt-0.5">NOM-004-SSA3-2012 — Expediente Clínico Electrónico</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{org?.name ?? organization.id}</p>
            {org?.address && <p className="text-zinc-500">{org.address}</p>}
            {org?.phone && <p className="text-zinc-500">{org.phone}</p>}
            <p className="text-zinc-500 mt-1">{today}</p>
          </div>
        </div>

        {/* Patient data */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 border-b border-zinc-200 pb-1">Datos del Paciente</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Field label="Nombre completo" value={patient.name ?? '—'} />
            <Field label="Fecha de nacimiento" value={patient.date_of_birth ? `${format(new Date(patient.date_of_birth), 'd MMM yyyy', { locale: es })} (${age} años)` : '—'} />
            <Field label="Género" value={patient.gender ?? '—'} />
            <Field label="CURP" value={patient.curp ?? '—'} />
            <Field label="Tipo de sangre" value={patient.blood_type ?? '—'} />
            <Field label="Teléfono" value={patient.phone} />
            {patient.insurance_provider && <Field label="Aseguradora" value={patient.insurance_provider} />}
            {patient.insurance_policy && <Field label="Póliza" value={patient.insurance_policy} />}
            {patient.allergies && <Field label="Alergias" value={patient.allergies} warn />}
          </div>
        </section>

        {/* Referring doctor */}
        {patient.referring_doctor && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 border-b border-zinc-200 pb-1">Médico Referente</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <Field label="Nombre" value={patient.referring_doctor} />
              {patient.referring_doctor_specialty && <Field label="Especialidad" value={patient.referring_doctor_specialty} />}
              {patient.referring_doctor_phone && <Field label="Teléfono" value={patient.referring_doctor_phone} />}
            </div>
          </section>
        )}

        {/* Treatment plan summary */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 border-b border-zinc-200 pb-1">Plan de Tratamiento</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Field label="Título del plan" value={plan.title} />
            <Field label="Terapeuta responsable" value={staffName} />
            {plan.diagnosis && <Field label="Diagnóstico" value={plan.diagnosis} />}
            {plan.starts_at && <Field label="Fecha inicio" value={format(new Date(plan.starts_at), 'd MMM yyyy', { locale: es })} />}
            {plan.ends_at && <Field label="Fecha cierre" value={format(new Date(plan.ends_at), 'd MMM yyyy', { locale: es })} />}
            <Field label="Sesiones realizadas" value={plan.total_sessions ? `${plan.sessions_done} de ${plan.total_sessions}` : `${plan.sessions_done}`} />
            <Field label="Estado" value={plan.status === 'completed' ? 'Completado' : plan.status} />
          </div>
          {plan.goals && (
            <div className="mt-3 text-sm">
              <span className="font-semibold">Objetivos: </span>{plan.goals}
            </div>
          )}
          {plan.notes && (
            <div className="mt-2 text-sm text-zinc-600">
              <span className="font-semibold">Notas del plan: </span>{plan.notes}
            </div>
          )}
        </section>

        {/* SOAP evolution */}
        {notes && notes.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 border-b border-zinc-200 pb-1">Evolución Clínica — Notas SOAP</h2>
            <div className="space-y-5">
              {notes.map((note, i) => {
                const apptDate = (note as unknown as { appointment?: { starts_at: string } }).appointment?.starts_at
                return (
                  <div key={note.id} className="text-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-semibold">
                        Sesión {i + 1} — {apptDate ? format(new Date(apptDate), 'd MMM yyyy', { locale: es }) : format(new Date(note.created_at), 'd MMM yyyy', { locale: es })}
                      </p>
                      {note.pain_level !== null && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100">Dolor: {note.pain_level}/10</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {note.soap_subjective && <SoapBlock label="Subjetivo" value={note.soap_subjective} />}
                      {note.soap_objective && <SoapBlock label="Objetivo" value={note.soap_objective} />}
                      {note.soap_assessment && <SoapBlock label="Análisis" value={note.soap_assessment} />}
                      {note.soap_plan && <SoapBlock label="Plan" value={note.soap_plan} />}
                    </div>
                    {note.next_session_plan && (
                      <p className="mt-1.5 text-zinc-500 text-xs"><span className="font-medium">Próxima sesión: </span>{note.next_session_plan}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Signatures */}
        <section className="pt-8 border-t border-zinc-200">
          <div className="grid grid-cols-2 gap-16 text-sm">
            <div>
              <div className="h-16 border-b border-zinc-900 mb-2" />
              <p className="font-semibold">{staffName}</p>
              <p className="text-zinc-500">Fisioterapeuta responsable</p>
            </div>
            <div>
              <div className="h-16 border-b border-zinc-900 mb-2" />
              <p className="font-semibold">{patient.referring_doctor ?? 'Médico receptor'}</p>
              <p className="text-zinc-500">Médico receptor</p>
            </div>
          </div>
        </section>

        <p className="text-[10px] text-zinc-400 text-center pt-2">
          Documento generado por Turno · {today} · Este documento tiene validez oficial conforme a la NOM-004-SSA3-2012
        </p>
      </div>
    </div>
  )
}

function Field({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <span className="text-zinc-400 text-xs">{label}: </span>
      <span className={`font-medium ${warn ? 'text-red-600' : ''}`}>{value}</span>
    </div>
  )
}

function SoapBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-50 rounded p-2.5 border border-zinc-200">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{label}</p>
      <p className="text-zinc-800 leading-relaxed">{value}</p>
    </div>
  )
}
