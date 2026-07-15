'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, FlaskConical, ListPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { LabTest, LabAnalyte } from '@/types/database'

type TestWithLinks = LabTest & { lab_test_analytes: { id: string; analyte_id: string; sort_order: number }[] }

interface Props {
  tests: TestWithLinks[]
  analytes: LabAnalyte[]
  organizationId: string
}

const emptyTest = { name: '', description: '', price: '' }
const emptyAnalyte = { name: '', default_unit: '', ref_range: '' }

export function CatalogClient({ tests, analytes, organizationId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // ── Estudios ────────────────────────────────────────────────────────────────
  const [testOpen, setTestOpen] = useState(false)
  const [editingTest, setEditingTest] = useState<LabTest | null>(null)
  const [testForm, setTestForm] = useState(emptyTest)
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function openCreateTest() {
    setEditingTest(null)
    setTestForm(emptyTest)
    setTestOpen(true)
  }

  function openEditTest(t: LabTest) {
    setEditingTest(t)
    setTestForm({ name: t.name, description: t.description ?? '', price: String(t.price ?? '') })
    setTestOpen(true)
  }

  async function handleSaveTest() {
    if (!testForm.name.trim()) return toast.error('El nombre es requerido')
    const price = parseFloat(testForm.price)
    if (isNaN(price) || price < 0) return toast.error('Ingresa un precio válido')

    setLoading(true)
    const payload = { name: testForm.name.trim(), description: testForm.description || null, price }

    const { error } = editingTest
      ? await supabase.from('lab_tests').update(payload).eq('id', editingTest.id)
      : await supabase.from('lab_tests').insert({ ...payload, organization_id: organizationId })

    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success(editingTest ? 'Estudio actualizado' : 'Estudio creado')
    setTestOpen(false)
    router.refresh()
  }

  async function handleDeleteTest() {
    if (!deleteTestId) return
    const { error } = await supabase.from('lab_tests').delete().eq('id', deleteTestId)
    setDeleteTestId(null)
    if (error) {
      // FK desde lab_order_tests: el estudio ya se usó en órdenes
      return toast.error('Este estudio ya se usó en órdenes. Desactívalo en lugar de eliminarlo.')
    }
    toast.success('Estudio eliminado')
    router.refresh()
  }

  async function toggleTestActive(t: LabTest) {
    const { error } = await supabase.from('lab_tests').update({ is_active: !t.is_active }).eq('id', t.id)
    if (error) return toast.error(error.message)
    router.refresh()
  }

  // ── Analitos del estudio ─────────────────────────────────────────────────────
  const [linksTest, setLinksTest] = useState<TestWithLinks | null>(null)
  const [addAnalyteId, setAddAnalyteId] = useState('')

  const linkedIds = new Set((linksTest?.lab_test_analytes ?? []).map(l => l.analyte_id))
  const linkedSorted = (linksTest?.lab_test_analytes ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
  const availableAnalytes = analytes.filter(a => a.is_active && !linkedIds.has(a.id))
  const analyteById = Object.fromEntries(analytes.map(a => [a.id, a]))

  async function handleAddLink() {
    if (!linksTest || !addAnalyteId) return
    const maxOrder = Math.max(0, ...linksTest.lab_test_analytes.map(l => l.sort_order))
    const { error } = await supabase.from('lab_test_analytes').insert({
      test_id: linksTest.id,
      analyte_id: addAnalyteId,
      sort_order: maxOrder + 1,
    })
    if (error) return toast.error(error.message)
    // Actualiza el dialog sin cerrar
    setLinksTest(p => p && ({
      ...p,
      lab_test_analytes: [...p.lab_test_analytes, { id: crypto.randomUUID(), analyte_id: addAnalyteId, sort_order: maxOrder + 1 }],
    }))
    setAddAnalyteId('')
    router.refresh()
  }

  async function handleRemoveLink(linkAnalyteId: string) {
    if (!linksTest) return
    const { error } = await supabase
      .from('lab_test_analytes')
      .delete()
      .eq('test_id', linksTest.id)
      .eq('analyte_id', linkAnalyteId)
    if (error) {
      return toast.error('No se puede quitar: ya hay resultados capturados con este analito.')
    }
    setLinksTest(p => p && ({
      ...p,
      lab_test_analytes: p.lab_test_analytes.filter(l => l.analyte_id !== linkAnalyteId),
    }))
    router.refresh()
  }

  // ── Analitos (catálogo) ──────────────────────────────────────────────────────
  const [analyteOpen, setAnalyteOpen] = useState(false)
  const [editingAnalyte, setEditingAnalyte] = useState<LabAnalyte | null>(null)
  const [analyteForm, setAnalyteForm] = useState(emptyAnalyte)
  const [deleteAnalyteId, setDeleteAnalyteId] = useState<string | null>(null)

  function openCreateAnalyte() {
    setEditingAnalyte(null)
    setAnalyteForm(emptyAnalyte)
    setAnalyteOpen(true)
  }

  function openEditAnalyte(a: LabAnalyte) {
    setEditingAnalyte(a)
    setAnalyteForm({ name: a.name, default_unit: a.default_unit ?? '', ref_range: a.ref_range ?? '' })
    setAnalyteOpen(true)
  }

  async function handleSaveAnalyte() {
    if (!analyteForm.name.trim()) return toast.error('El nombre es requerido')
    setLoading(true)
    const payload = {
      name: analyteForm.name.trim(),
      default_unit: analyteForm.default_unit || null,
      ref_range: analyteForm.ref_range || null,
    }

    const { error } = editingAnalyte
      ? await supabase.from('lab_analytes').update(payload).eq('id', editingAnalyte.id)
      : await supabase.from('lab_analytes').insert({ ...payload, organization_id: organizationId })

    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success(editingAnalyte ? 'Analito actualizado' : 'Analito creado')
    setAnalyteOpen(false)
    router.refresh()
  }

  async function handleDeleteAnalyte() {
    if (!deleteAnalyteId) return
    const { error } = await supabase.from('lab_analytes').delete().eq('id', deleteAnalyteId)
    setDeleteAnalyteId(null)
    if (error) {
      return toast.error('Este analito está asociado a estudios o resultados. Desactívalo en su lugar.')
    }
    toast.success('Analito eliminado')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Catálogo de estudios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Estudios, precios y analitos que capturas en resultados</p>
      </div>

      <Tabs defaultValue="tests">
        <TabsList>
          <TabsTrigger value="tests"><FlaskConical className="h-3.5 w-3.5 mr-1.5" />Estudios ({tests.length})</TabsTrigger>
          <TabsTrigger value="analytes"><ListPlus className="h-3.5 w-3.5 mr-1.5" />Analitos ({analytes.length})</TabsTrigger>
        </TabsList>

        {/* ── ESTUDIOS ── */}
        <TabsContent value="tests" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateTest}>
              <Plus className="h-4 w-4 mr-1.5" />Nuevo estudio
            </Button>
          </div>

          {tests.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              Sin estudios todavía. Crea el primero — por ejemplo &quot;Biometría Hemática&quot;.
            </CardContent></Card>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Estudio</th>
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Analitos</th>
                    <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Precio</th>
                    <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Estado</th>
                    <th className="w-28" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tests.map(t => (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{t.name}</p>
                        {t.description && <p className="text-xs text-muted-foreground truncate max-w-[280px]">{t.description}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <button
                          onClick={() => setLinksTest(t)}
                          className="text-xs text-primary hover:underline"
                        >
                          {t.lab_test_analytes.length} analito{t.lab_test_analytes.length === 1 ? '' : 's'} →
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">${Number(t.price).toLocaleString('es-MX')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => toggleTestActive(t)}>
                          <Badge variant="outline" className={t.is_active ? 'text-emerald-500 border-emerald-500/30' : 'text-muted-foreground'}>
                            {t.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTest(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTestId(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── ANALITOS ── */}
        <TabsContent value="analytes" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateAnalyte}>
              <Plus className="h-4 w-4 mr-1.5" />Nuevo analito
            </Button>
          </div>

          {analytes.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              Sin analitos todavía. Crea los parámetros que capturas — por ejemplo &quot;Hemoglobina&quot; (g/dL, 13.5 - 17.5).
            </CardContent></Card>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Analito</th>
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Unidad</th>
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Rango de referencia</th>
                    <th className="w-28" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytes.map(a => (
                    <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.default_unit ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{a.ref_range ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAnalyte(a)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteAnalyteId(a.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: crear/editar estudio */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingTest ? 'Editar estudio' : 'Nuevo estudio'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input placeholder="Biometría Hemática" value={testForm.name} onChange={e => setTestForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción (opcional)</Label>
              <Textarea placeholder="Conteo completo de células sanguíneas..." value={testForm.description} onChange={e => setTestForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Precio (MXN)</Label>
              <Input type="number" min="0" placeholder="350" value={testForm.price} onChange={e => setTestForm(p => ({ ...p, price: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTest} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: analitos del estudio */}
      <Dialog open={!!linksTest} onOpenChange={open => { if (!open) setLinksTest(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Analitos de {linksTest?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Al capturar resultados de este estudio, solo aparecerán estos analitos.
            </p>

            {linkedSorted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Este estudio aún no tiene analitos.</p>
            ) : (
              <div className="space-y-1.5">
                {linkedSorted.map((link, i) => {
                  const a = analyteById[link.analyte_id]
                  if (!a) return null
                  return (
                    <div key={link.analyte_id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{[a.default_unit, a.ref_range].filter(Boolean).join(' · ') || 'Sin unidad ni rango'}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleRemoveLink(link.analyte_id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={addAnalyteId} onValueChange={v => setAddAnalyteId(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Agregar analito..." /></SelectTrigger>
                  <SelectContent>
                    {availableAnalytes.length === 0 ? (
                      <SelectItem value="__none" disabled>No hay analitos disponibles — créalos en la pestaña Analitos</SelectItem>
                    ) : (
                      availableAnalytes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}{a.default_unit ? ` (${a.default_unit})` : ''}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddLink} disabled={!addAnalyteId}>Agregar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: crear/editar analito */}
      <Dialog open={analyteOpen} onOpenChange={setAnalyteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingAnalyte ? 'Editar analito' : 'Nuevo analito'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input placeholder="Hemoglobina" value={analyteForm.name} onChange={e => setAnalyteForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unidad</Label>
                <Input placeholder="g/dL" value={analyteForm.default_unit} onChange={e => setAnalyteForm(p => ({ ...p, default_unit: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Rango de referencia</Label>
                <Input placeholder="13.5 - 17.5" value={analyteForm.ref_range} onChange={e => setAnalyteForm(p => ({ ...p, ref_range: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              La unidad y el rango se precargan al capturar resultados; el químico puede ajustarlos por paciente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalyteOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAnalyte} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmaciones de borrado */}
      <AlertDialog open={!!deleteTestId} onOpenChange={open => { if (!open) setDeleteTestId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estudio?</AlertDialogTitle>
            <AlertDialogDescription>Se elimina del catálogo junto con sus asociaciones de analitos. Las órdenes existentes no se tocan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTest}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAnalyteId} onOpenChange={open => { if (!open) setDeleteAnalyteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar analito?</AlertDialogTitle>
            <AlertDialogDescription>Solo se puede eliminar si ningún estudio ni resultado lo usa.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAnalyte}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
