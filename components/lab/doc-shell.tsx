import { PrintButton } from './print-button'

interface OrgInfo {
  name: string
  address: string | null
  phone: string | null
  logo_url: string | null
}

interface Props {
  org: OrgInfo
  docTitle: string
  folio: string
  dateLabel: string
  previewLabel: string
  children: React.ReactNode
}

/**
 * Marco común de documentos imprimibles del laboratorio (recibo, cotización,
 * reporte de resultados): barra de vista previa oculta al imprimir + encabezado
 * con branding de la organización.
 */
export function DocShell({ org, docTitle, folio, dateLabel, previewLabel, children }: Props) {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      <div className="print:hidden flex items-center justify-between px-6 py-3 bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
        <p className="text-sm text-zinc-500">Vista previa — {previewLabel}</p>
        <PrintButton />
      </div>

      <div className="max-w-[720px] mx-auto px-8 py-10">
        {/* Encabezado con branding */}
        <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-5 mb-8">
          <div className="flex items-center gap-4">
            {org.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={org.name} className="h-14 w-14 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-xl font-bold leading-tight">{org.name}</h1>
              {org.address && <p className="text-xs text-zinc-500 mt-0.5">{org.address}</p>}
              {org.phone && <p className="text-xs text-zinc-500">Tel. {org.phone}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">{docTitle}</p>
            <p className="text-lg font-mono font-bold">{folio}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{dateLabel}</p>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
