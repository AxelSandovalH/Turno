import Link from 'next/link'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'
import { UserRound, Plus, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { isMedicalVertical, customerLabel } from '@/lib/business-type'

const PAGE_SIZE = 50

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)

  const { organization } = await requireOrganization()
  const db = createServiceClient()

  const isMedical = isMedicalVertical(organization.business_type)
  const label = customerLabel(organization.business_type)
  const labelPlural = customerLabel(organization.business_type, true)

  const from = (page - 1) * PAGE_SIZE
  const { data: patients, count } = await db
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('organization_id', organization.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{labelPlural}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} registrados</p>
        </div>
        <Link href="/patients/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo {label.toLowerCase()}
          </Button>
        </Link>
      </div>

      {(!patients || patients.length === 0) ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <UserRound className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Sin {labelPlural.toLowerCase()} todavía</p>
          <p className="text-sm text-muted-foreground mb-5">Los {labelPlural.toLowerCase()} que agendan por WhatsApp aparecen aquí automáticamente.</p>
          <Link href="/patients/new">
            <Button size="sm">Agregar {label.toLowerCase()}</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">{label}</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">Edad</th>
                {isMedical && <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden lg:table-cell">Médico referente</th>}
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {patients.map(p => {
                const age = p.date_of_birth
                  ? differenceInYears(new Date(), new Date(p.date_of_birth))
                  : null
                return (
                  <tr key={p.id} className="hover:bg-violet-500/5 hover:border-l-2 hover:border-l-violet-500 transition-all cursor-pointer group">
                    <td className="px-4 py-3">
                      <Link href={`/patients/${p.id}`} className="block">
                        <p className="font-medium text-foreground group-hover:text-violet-400 transition-colors">{p.name ?? '—'}</p>
                        {p.allergies && (
                          <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30 mt-0.5">
                            Alergias
                          </Badge>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      <Link href={`/patients/${p.id}`} className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        {p.phone}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      <Link href={`/patients/${p.id}`} className="block">
                        {age !== null ? `${age} años` : '—'}
                      </Link>
                    </td>
                    {isMedical && (
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        <Link href={`/patients/${p.id}`} className="block">
                          {p.referring_doctor
                            ? <span>{p.referring_doctor} <span className="text-xs opacity-60">{p.referring_doctor_specialty}</span></span>
                            : '—'}
                        </Link>
                      </td>
                    )}
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      <Link href={`/patients/${p.id}`} className="block">
                        {format(new Date(p.created_at), 'd MMM yyyy', { locale: es })}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`?page=${page - 1}`}>
                <Button variant="outline" size="sm">← Anterior</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`?page=${page + 1}`}>
                <Button variant="outline" size="sm">Siguiente →</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
