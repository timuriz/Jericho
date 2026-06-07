import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useCreateAppointment, useAppointmentTypes, useAppointmentLocations } from '@/hooks/useAppointments';
import { useCustomers } from '@/hooks/useCustomers';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AppointmentForm({ open, onClose }: Props) {
  const { data: customersData } = useCustomers();
  const { data: typesData } = useAppointmentTypes();
  const { data: locationsData } = useAppointmentLocations();
  const create = useCreateAppointment();

  const [form, setForm] = useState({
    customerId: '',
    appointmentTypeId: '',
    locationId: '',
    startTime: '',
    notes: '',
    wantsEarlierSlot: false,
  });

  const handleSubmit = () => {
    if (!form.customerId || !form.appointmentTypeId || !form.locationId || !form.startTime) return;
    create.mutate(
      {
        customerId: form.customerId,
        appointmentTypeId: form.appointmentTypeId,
        locationId: form.locationId,
        startTime: new Date(form.startTime).toISOString(),
        notes: form.notes || undefined,
        wantsEarlierSlot: form.wantsEarlierSlot,
      },
      {
        onSuccess: () => {
          setForm({ customerId: '', appointmentTypeId: '', locationId: '', startTime: '', notes: '', wantsEarlierSlot: false });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={form.customerId} onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customersData?.data.filter((c) => c.isActive).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.appointmentTypeId} onValueChange={(v) => setForm((f) => ({ ...f, appointmentTypeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  {typesData?.data.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={form.locationId} onValueChange={(v) => setForm((f) => ({ ...f, locationId: v }))}>
                <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  {locationsData?.data.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Date & Time</Label>
            <Input
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any notes..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Wants earlier appointment</p>
              <p className="text-xs text-muted-foreground">Notify this patient if an earlier slot opens up</p>
            </div>
            <Switch
              checked={form.wantsEarlierSlot}
              onCheckedChange={(v) => setForm((f) => ({ ...f, wantsEarlierSlot: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            loading={create.isPending}
            disabled={!form.customerId || !form.appointmentTypeId || !form.locationId || !form.startTime}
          >
            Book appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
