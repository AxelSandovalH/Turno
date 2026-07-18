'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import type { Staff, StaffRoleTag } from '@/types/database'

const NEW_TAG_VALUE = '__new_tag__'

interface StaffListProps {
  staff: Staff[]
  roleTags: StaffRoleTag[]
  organizationId: string
  staffLabel: string
  /** Etiqueta sugerida por default para nuevo staff (ej. "Fisioterapeuta") */
  defaultRole: string
}

function emptyForm(defaultRole: string) {
  return { name: '', phone: '', role: defaultRole, license_number: '', commission_type: 'percentage' as 'percentage' | 'fixed_per_session', commission_value: '' }
}

export function StaffList({ staff, roleTags: initialRoleTags, organizationId, staffLabel, defaultRole }: StaffListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [form, setForm] = useState(emptyForm(defaultRole))
  const [loading, setLoading] = useState(false)

  // Tags disponibles: las de la org + defaultRole si aún no existe + cualquier
  // rol ya usado por staff existente que no esté en la tabla (datos previos a
  // esta feature). Se mantiene en estado local para reflejar altas al vuelo.
  const [roleTags, setRoleTags] = useState<string[]>(() => {
    const labels = new Set(initialRoleTags.map(t => t.label))
    labels.add(defaultRole)
    staff.forEach(s => { if (s.role) labels.add(s.role) })
    return Array.from(labels).sort((a, b) => a.localeCompare(b, 'es'))
  })
  const [addingTag, setAddingTag] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')
  const [savingTag, setSavingTag] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm(defaultRole))
    setAddingTag(false)
    setOpen(true)
  }

  function openEdit(s: Staff) {
    setEditing(s)
    setForm({
      name: s.name,
      phone: s.phone ?? '',
      role: s.role,
      license_number: s.license_number ?? '',
      commission_type: s.commission_type ?? 'percentage',
      commission_value: s.commission_value?.toString() ?? '',
    })
    setAddingTag(false)
    setOpen(true)
  }

  function handleRoleSelect(value: string | null) {
    if (!value) return
    if (value === NEW_TAG_VALUE) {
      setNewTagValue('')
      setAddingTag(true)
      return
    }
    setForm(p => ({ ...p, role: value }))
  }

  async function handleCreateTag() {
    const label = newTagValue.trim()
    if (!label) return
    if (roleTags.some(t => t.toLowerCase() === label.toLowerCase())) {
      setForm(p => ({ ...p, role: label }))
      setAddingTag(false)
      return
    }
    setSavingTag(true)
    const { error } = await supabase
      .from('staff_roles')
      .insert({ organization_id: organizationId, label })
    setSavingTag(false)
    if (error) { toast.error(error.message); return }
    setRoleTags(prev => [...prev, label].sort((a, b) => a.localeCompare(b, 'es')))
    setForm(p => ({ ...p, role: label }))
    setAddingTag(false)
    toast.success('Etiqueta creada')
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    setLoading(true)

    const commissionPayload = {
      commission_type: form.commission_type,
      commission_value: form.commission_value ? parseFloat(form.commission_value) : 0,
    }
    if (editing) {
      const { error } = await supabase
        .from('staff')
        .update({ name: form.name, phone: form.phone || null, role: form.role, license_number: form.license_number || null, ...commissionPayload })
        .eq('id', editing.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success(`${staffLabel} actualizado`)
    } else {
      const { error } = await supabase
        .from('staff')
        .insert({ organization_id: organizationId, name: form.name, phone: form.phone || null, role: form.role, license_number: form.license_number || null, ...commissionPayload })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success(`${staffLabel} agregado`)
    }

    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('staff').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    toast.success(`${staffLabel} eliminado`)
    setDeleteId(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar {staffLabel.toLowerCase()}
        </Button>
      </div>

      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No hay {staffLabel.toLowerCase()}s registrados. Agrega el primero.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {staff.map(s => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {s.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{s.name}</p>
                    <Badge variant="outline" className="text-xs">{s.is_owner ? 'Dueño' : s.role}</Badge>
                    {!s.is_active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                  </div>
                  {s.phone && <p className="text-sm text-muted-foreground">{s.phone}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(s.id)}
                    disabled={s.is_owner}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${staffLabel.toLowerCase()}` : `Agregar ${staffLabel.toLowerCase()}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Nombre completo"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono (opcional)</Label>
              <Input
                placeholder="521XXXXXXXXXX"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              {addingTag ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej. Masajista, Gerente..."
                    value={newTagValue}
                    onChange={e => setNewTagValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag() } }}
                    autoFocus
                  />
                  <Button size="icon" onClick={handleCreateTag} disabled={savingTag || !newTagValue.trim()}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setAddingTag(false)} disabled={savingTag}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select value={form.role} onValueChange={handleRoleSelect}>
                  <SelectTrigger>
                    <SelectValue>{form.role}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roleTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                    <SelectItem value={NEW_TAG_VALUE} className="text-violet-500 font-medium">
                      <Plus className="h-3.5 w-3.5 mr-1 inline" />Nueva etiqueta...
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">Personaliza los roles de tu equipo: recepcionista, terapeuta, masajista, gerente...</p>
            </div>
            <div className="space-y-2">
              <Label>Cédula profesional (opcional)</Label>
              <Input
                placeholder="1234567"
                value={form.license_number}
                onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Aparece en documentos oficiales (ej. reporte de resultados)</p>
            </div>
          </div>

          {/* Comisión */}
          <div className="pt-3 border-t border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comisión</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.commission_type}
                  onValueChange={v => v && setForm(p => ({ ...p, commission_type: v as 'percentage' | 'fixed_per_session' }))}
                >
                  <SelectTrigger><SelectValue>{ form.commission_type === 'percentage' ? '% sobre ingreso' : 'Monto fijo por sesión' }</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">% sobre ingreso</SelectItem>
                    <SelectItem value="fixed_per_session">Monto fijo por sesión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.commission_type === 'percentage' ? 'Porcentaje (%)' : 'Monto (MXN)'}</Label>
                <Input
                  type="number"
                  min={0}
                  max={form.commission_type === 'percentage' ? 100 : undefined}
                  placeholder={form.commission_type === 'percentage' ? '30' : '150'}
                  value={form.commission_value}
                  onChange={e => setForm(p => ({ ...p, commission_value: e.target.value }))}
                />
              </div>
            </div>
            {form.commission_value && (
              <p className="text-xs text-muted-foreground">
                {form.commission_type === 'percentage'
                  ? `Por cada $1,000 cobrados → $${(parseFloat(form.commission_value) * 10).toFixed(0)} de comisión`
                  : `Cada sesión completada → $${form.commission_value} de comisión`}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {staffLabel.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Las citas existentes no se eliminarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
