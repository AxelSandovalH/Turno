'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, UserPlus, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface TestOption { id: string; name: string; description: string | null; price: number }
interface PatientHit { id: string; name: string | null; phone: string }

interface Props {
  tests: TestOption[]
  organizationId: string
}

export function NewOrderClient({ tests, organizationId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // ── Paciente ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [hits, setHits] = useState<PatientHit[]>([])
  const [patient, setPatient] = useState<PatientHit | null>(null)
  const [quickCreate, setQuickCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setHits([]); return }
    const like = `%${q.trim()}%`
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .or(`name.ilike.${like},phone.ilike.${like}`)
      .limit(6)
    setHits(data ?? [])
  }, [organizationId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => runSearch(search), 250)
    return () => clearTimeout(t)
  }, [search, runSearch])

  // ── Estudios ────────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [discount, setDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleTest(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const subtotal = tests.filter(t => selected.has(t.id)).reduce((s, t) => s + Number(t.price), 0)
  const disc = Math.min(Math.max(parseFloat(discount) || 0, 0), subtotal)
  const total = subtotal - disc

  async function handleCreate() {
    if (!patient && !(quickCreate && newName.trim())) return toast.error('Selecciona o registra un paciente')
    if (selected.size === 0) return toast.error('Selecciona al menos un estudio')

    setSaving(true)
    const res = await fetch('/api/lab/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: patient?.id,
        newCustomer: !patient && quickCreate ? { name: newName, phone: newPhone } : undefined,
        testIds: Array.from(selected),
        discount: disc,
        notes,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) return toast.error(data.error ?? 'Error al crear la orden')
    toast.success(`Orden ${data.folio} creada`)
    router.push(`/lab/orders/${data.id}`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/lab/orders">
          <Button variant="ghost" size="icon" className="text-muted-foreground"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Nueva orden</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Recepción de paciente y estudios</p>
        </div>
      </div>

      {/* ── Paciente ── */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Paciente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {patient ? (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{patient.name ?? 'Sin nombre'}</p>
                <p className="text-xs text-muted-foreground">{patient.phone}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPatient(null)}>Cambiar</Button>
            </div>
          ) : quickCreate ? (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nombre completo</Label>
                  <Input placeholder="María López García" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input placeholder="5512345678" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                </div>
              </div>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setQuickCreate(false)}>
                ← Buscar paciente existente
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre o teléfono..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {hits.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {hits.map(h => (
                    <button
                      key={h.id}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
                      onClick={() => { setPatient(h); setSearch(''); setHits([]) }}
                    >
                      <span className="text-sm font-medium">{h.name ?? 'Sin nombre'}</span>
                      <span className="text-xs text-muted-foreground">{h.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              <button
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                onClick={() => setQuickCreate(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />Registrar paciente nuevo
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Estudios ── */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Estudios</CardTitle></CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay estudios activos. <Link href="/lab/tests" className="text-primary hover:underline">Crea tu catálogo primero</Link>.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {tests.map(t => {
                const isSel = selected.has(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTest(t.id)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      isSel ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      isSel ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {isSel && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                    </div>
                    <span className="text-sm font-semibold shrink-0">${Number(t.price).toLocaleString('es-MX')}</span>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Totales ── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Descuento (MXN, opcional)</Label>
              <Input type="number" min="0" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea className="min-h-[38px]" placeholder="Paciente en ayunas..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal ({selected.size} estudio{selected.size === 1 ? '' : 's'})</span>
              <span>${subtotal.toLocaleString('es-MX')}</span>
            </div>
            {disc > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Descuento</span><span>−${disc.toLocaleString('es-MX')}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold text-foreground pt-1">
              <span>Total</span><span>${total.toLocaleString('es-MX')}</span>
            </div>
          </div>

          <Button className="w-full" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creando orden...' : 'Crear orden'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
