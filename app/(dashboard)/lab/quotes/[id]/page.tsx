import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { DocShell } from '@/components/lab/doc-shell'

interface Props { params: Promise<{ id: string }> }

export default async function QuotePage({ params }: Props) {
  const { id } = await params
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'lab-orders')) redirect('/appointments')

  const db = createServiceClient()
  const { data: quote } = await db
    .from('lab_quotes')
    .select(`
      folio, customer_name, subtotal, discount, total, valid_until, created_at,
      tests:lab_quote_tests(price_at_quote, test:lab_tests(name, description))
    `)
    .eq('id', id)
    .eq('organization_id', organization.id)
    .single()

  if (!quote) notFound()

  const tests = quote.tests as unknown as { price_at_quote: number; test: { name: string; description: string | null } | null }[]
  const money = (n: number) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  return (
    <DocShell
      org={organization}
      docTitle="Cotización"
      folio={quote.folio}
      dateLabel={format(new Date(quote.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
      previewLabel={`Cotización ${quote.folio}`}
    >
      {quote.customer_name && (
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Cliente</p>
          <p className="text-base font-semibold">{quote.customer_name}</p>
        </div>
      )}

      <table className="w-full text-sm mb-8">
        <thead>
          <tr className="border-b border-zinc-300 text-[11px] uppercase tracking-wider text-zinc-400">
            <th className="text-left py-2 font-semibold">Estudio</th>
            <th className="text-right py-2 font-semibold">Precio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {tests.map((t, i) => (
            <tr key={i}>
              <td className="py-2.5">
                <p className="font-medium">{t.test?.name ?? '—'}</p>
                {t.test?.description && <p className="text-xs text-zinc-400">{t.test.description}</p>}
              </td>
              <td className="py-2.5 text-right align-top">{money(t.price_at_quote)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-10">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Subtotal</span><span>{money(quote.subtotal)}</span>
          </div>
          {Number(quote.discount) > 0 && (
            <div className="flex justify-between text-zinc-500">
              <span>Descuento</span><span>−{money(quote.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t-2 border-zinc-900 pt-2">
            <span>Total</span><span>{money(quote.total)}</span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-400">
        {quote.valid_until
          ? `Cotización válida hasta el ${format(new Date(`${quote.valid_until}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })} · `
          : ''}
        Precios en MXN, sujetos a cambio sin previo aviso.
      </p>
    </DocShell>
  )
}
