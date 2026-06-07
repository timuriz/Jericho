import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useCancelAppointment } from '@/hooks/useAppointments';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import type { Appointment } from '@/types';

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
}

export function CancelDialog({ appointment, onClose }: Props) {
  const [cancelledBy, setCancelledBy] = useState('');
  const cancel = useCancelAppointment();

  if (!appointment) return null;

  const handleCancel = () => {
    if (!cancelledBy.trim()) return;
    cancel.mutate(
      { id: appointment.id, cancelledBy: cancelledBy.trim() },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={!!appointment} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription>
            This will cancel the appointment and automatically start the recovery process to find a replacement.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Patient</span>
            <span className="font-medium">{appointment.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{appointment.appointmentTypeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{formatDateTime(appointment.startTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Value</span>
            <span className="font-medium text-red-600">{formatCurrency(appointment.price)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Cancelled by</Label>
          <Input
            value={cancelledBy}
            onChange={(e) => setCancelledBy(e.target.value)}
            placeholder="e.g. Reception, Dr. Smith, Patient"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Keep appointment</Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            loading={cancel.isPending}
            disabled={!cancelledBy.trim()}
          >
            Cancel & start recovery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
