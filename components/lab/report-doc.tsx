import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'
import { DocShell } from './doc-shell'

export interface ReportCustomer {
  name: string | null
  phone: string
  date_of_birth: string | null
  gender: string | null
}

export interface ReportResult {
  value: string | null
  unit: string | null
  ref_range: string | null
  captured_at: string | null
  analyte: { name: string } | null
  captured: { name: string; license_number: string | null } | null
}

export interface ReportTest {
  id: string
  test: { name: string } | null
  results: ReportResult[]
}

export interface ReportOrgInfo {
  name: string
  address: string | null
  phone: string | null
  logo_url: string | null
}

interface Props {
  org: ReportOrgInfo
  folio: string
  createdAt: string
  customer: ReportCustomer | null
  tests: ReportTest[]
}

/** Documento de reporte de resultados — compartido entre el dashboard y la vista pública por token. */
export function ReportDoc({ org, folio, createdAt, customer, tests }: Props) {
  const withResults = tests.filter(t => t.results.length > 0)
  const age = customer?.date_of_birth
    ? differenceInYears(new Date(), new Date(customer.date_of_birth))
    : null
  const genderLabel = customer?.gender === 'male' ? 'Masculino' : customer?.gender === 'female' ? 'Femenino' : null
  const responsible = withResults.flatMap(t => t.results).find(r => r.captured?.name)?.captured

  return (
    <DocShell
      org={org}
      docTitle="Resultados"
      folio={folio}
      dateLabel={format(new Date(createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
      previewLabel={`Reporte de resultados ${folio}`}
    >
      {/* Paciente */}
      <div className="grid grid-cols-3 gap-4 mb-8 rounded-lg bg-zinc-50 border border-zinc-200 px-5 py-4 text-sm">
        <div className="col-span-3 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Paciente</p>
          <p className="font-semibold">{customer?.name ?? 'Sin nombre'}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Edad</p>
          <p>{age !== null ? `${age} años` : '—'}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Sexo</p>
          <p>{genderLabel ?? '—'}</p>
        </div>
      </div>

      {/* Resultados por estudio */}
      <div className="space-y-8 mb-12">
        {withResults.map(t => (
          <div key={t.id}>
            <h2 className="text-sm font-bold uppercase tracking-wide border-b-2 border-zinc-900 pb-1.5 mb-3">
              {t.test?.name ?? 'Estudio'}
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-200">
                  <th className="text-left py-1.5 font-semibold">Analito</th>
                  <th className="text-right py-1.5 font-semibold">Resultado</th>
                  <th className="text-left py-1.5 pl-6 font-semibold">Unidad</th>
                  <th className="text-left py-1.5 font-semibold">Valores de referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {t.results.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2">{r.analyte?.name ?? '—'}</td>
                    <td className="py-2 text-right font-bold">{r.value ?? '—'}</td>
                    <td className="py-2 pl-6 text-zinc-500">{r.unit ?? ''}</td>
                    <td className="py-2 text-zinc-500">{r.ref_range ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Firma */}
      <div className="flex justify-end pt-10">
        <div className="text-center w-64">
          <div className="border-t border-zinc-400 pt-2">
            <p className="text-sm font-semibold">{responsible?.name ?? ''}</p>
            {responsible?.license_number && (
              <p className="text-xs text-zinc-500">Céd. Prof. {responsible.license_number}</p>
            )}
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Responsable del laboratorio</p>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-zinc-400 mt-10">
        Este reporte es informativo y debe ser interpretado por un médico. {org.name}
      </p>
    </DocShell>
  )
}
