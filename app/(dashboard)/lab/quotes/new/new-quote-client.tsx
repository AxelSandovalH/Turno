'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TestOption { id: string; name: string; description: string | null; price: number }

export function NewQuoteClient({ tests }: { tests: TestOption[] }) {
  const router = useRouter()
  const [customerName, setCustomerName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [discount, setDiscount] = useState('')
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
    if (selected.size === 0) return toast.error('Selecciona al menos un estudio')
    setSaving(true)
    const res = await fetch('/api/lab/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, testIds: Array.from(selected), discount: disc }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) return toast.error(data.error ?? 'Error al crear la cotización')
    toast.success(`Cotización ${data.folio} creada`)
    router.push(`/lab/quotes/${data.id}`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/lab/quotes">
          <Button variant="ghost" size="icon" className="text-muted-foreground"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Nueva cotización</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Presupuesto imprimible, sin registrar venta</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-1.5 max-w-sm">
            <Label>Nombre del cliente (opcional)</Label>
            <Input placeholder="María López" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Estudios</CardTitle></CardHeader>
        <CardContent>
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
                  </div>
                  <span className="text-sm font-semibold shrink-0">${Number(t.price).toLocaleString('es-MX')}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5 max-w-[200px]">
            <Label>Descuento (MXN, opcional)</Label>
            <Input type="number" min="0" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
          </div>
          <div className="border-t border-border pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>${subtotal.toLocaleString('es-MX')}</span>
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
            {saving ? 'Creando...' : 'Crear cotización'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
