'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, User } from 'lucide-react'
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
import type { Staff, StaffRole } from '@/types/database'

function getRoleLabel(role: StaffRole, staffLabel: string): string {
  if (role === 'owner') return 'Dueño'
  if (role === 'manager') return 'Manager'
  return staffLabel
}

interface StaffListProps {
  staff: Staff[]
  organizationId: string
  staffLabel: string
}

const empty = { name: '', phone: '', role: 'staff' as StaffRole }

export function StaffList({ staff, organizationId, staffLabel }: StaffListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  function openEdit(s: Staff) {
    setEditing(s)
    setForm({ name: s.name, phone: s.phone ?? '', role: s.role })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    setLoading(true)

    if (editing) {
      const { error } = await supabase
        .from('staff')
        .update({ name: form.name, phone: form.phone || null, role: form.role })
        .eq('id', editing.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success(`${staffLabel} actualizado`)
    } else {
      const { error } = await supabase
        .from('staff')
        .insert({ organization_id: organizationId, name: form.name, phone: form.phone || null, role: form.role })
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
                    <Badge variant="outline" className="text-xs">{getRoleLabel(s.role, staffLabel)}</Badge>
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
                    disabled={s.role === 'owner'}
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
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v as StaffRole }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">{staffLabel}</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="owner">Dueño</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
