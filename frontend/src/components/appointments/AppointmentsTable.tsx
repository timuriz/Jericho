import { useState } from 'react';
import { MoreHorizontal, Plus, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointments } from '@/hooks/useAppointments';
import { formatDateTime, formatCurrency, getAppointmentStatusColor } from '@/lib/utils';
import { AppointmentForm } from './AppointmentForm';
import { CancelDialog } from './CancelDialog';
import type { Appointment, AppointmentStatus } from '@/types';

const STATUS_OPTIONS: { label: string; value: AppointmentStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Booked', value: 'BOOKED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Recovered', value: 'RECOVERED' },
];

export function AppointmentsTable() {
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  const { data, isLoading } = useAppointments(statusFilter ? { status: statusFilter } : undefined);
  const appointments = (data?.data ?? []).filter((a) =>
    !search || a.customerName.toLowerCase().includes(search.toLowerCase())
    || a.appointmentTypeName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients..."
              className="pl-8 w-48"
            />
          </div>
          <Select
            value={statusFilter || '__ALL__'}
            onValueChange={(v) => setStatusFilter(v === '__ALL__' ? '' : v as AppointmentStatus)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value || '__ALL__'} value={o.value || '__ALL__'}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Book appointment
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date & Time</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Value</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No appointments found
                </td>
              </tr>
            ) : (
              appointments.map((appt) => (
                <tr key={appt.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{appt.customerName}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{appt.appointmentTypeName}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {appt.appointmentTypeName}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {formatDateTime(appt.startTime)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {appt.locationName}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-medium">
                    {formatCurrency(appt.price)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getAppointmentStatusColor(appt.status) as any}>
                      {appt.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {appt.status === 'BOOKED' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setCancelTarget(appt)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel appointment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AppointmentForm open={showForm} onClose={() => setShowForm(false)} />
      <CancelDialog appointment={cancelTarget} onClose={() => setCancelTarget(null)} />
    </div>
  );
}
