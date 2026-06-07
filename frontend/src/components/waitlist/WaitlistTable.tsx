import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatRelative, getInitials } from '@/lib/utils';
import type { WaitlistEntry } from '@/types';

interface Props {
  entries: WaitlistEntry[];
  loading: boolean;
}

export function WaitlistTable({ entries, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">No upcoming appointments</p>
        <p className="text-xs text-muted-foreground mt-1">
          Patients with a booked appointment will appear here automatically
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="py-3 px-4 text-left font-medium text-muted-foreground">Patient</th>
            <th className="py-3 px-4 text-left font-medium text-muted-foreground">Appointment Type</th>
            <th className="py-3 px-4 text-left font-medium text-muted-foreground">Scheduled</th>
            <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(entry.customerName)}
                  </div>
                  <div>
                    <p className="font-medium">{entry.customerName}</p>
                    <p className="text-xs text-muted-foreground">{entry.customerPhone}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <p className="font-medium">{entry.appointmentTypeName}</p>
                <p className="text-xs text-muted-foreground">{entry.locationName}</p>
              </td>
              <td className="py-3 px-4 text-muted-foreground text-xs">
                <p>{formatDate(entry.joinedAt)}</p>
                <p className="text-muted-foreground/60">{formatRelative(entry.joinedAt)}</p>
              </td>
              <td className="py-3 px-4">
                <Badge variant="success">Booked</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
