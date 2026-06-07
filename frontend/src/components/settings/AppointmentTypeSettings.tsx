import { useState } from 'react';
import { Plus, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointmentTypes, useAppointmentLocations, useCreateAppointmentType } from '@/hooks/useAppointments';
import { formatCurrency } from '@/lib/utils';

export function AppointmentTypeSettings() {
  const { data: typesData, isLoading } = useAppointmentTypes();
  const { data: locationsData } = useAppointmentLocations();
  const create = useCreateAppointmentType();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', duration: '', price: '', locationId: '' });

  const locations = locationsData?.data ?? [];
  const types = typesData?.data ?? [];

  const valid = form.name.trim() && form.duration && form.price && form.locationId;

  const handleSubmit = () => {
    if (!valid) return;
    create.mutate(
      {
        name: form.name.trim(),
        duration: parseInt(form.duration, 10),
        price: parseFloat(form.price),
        locationId: form.locationId,
      },
      {
        onSuccess: () => {
          setForm({ name: '', duration: '', price: '', locationId: '' });
          setOpen(false);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Appointment Types</h3>
          <p className="text-sm text-muted-foreground">Manage the services offered at your locations.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add type
        </Button>
      </div>

      <div className="rounded-lg border divide-y">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))
        ) : types.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No appointment types yet. Add one to get started.
          </div>
        ) : (
          types.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1 font-medium text-sm">{t.name}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t.duration} min
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(t.price)}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Appointment Type</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Dental Cleaning"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  placeholder="60"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="120.00"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={form.locationId} onValueChange={(v) => setForm((f) => ({ ...f, locationId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!valid || create.isPending}>
              Create type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
