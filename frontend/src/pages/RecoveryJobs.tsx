import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RecoveryStatusBadge } from '@/components/recovery/RecoveryStatusBadge';
import { useRecoveryJobs } from '@/hooks/useRecoveryJobs';
import { formatRelative, formatDateTime } from '@/lib/utils';
import type { RecoveryJobStatus } from '@/types';

const STATUS_OPTIONS: { label: string; value: RecoveryJobStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Success', value: 'SUCCESS' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Escalated', value: 'ESCALATED' },
];

export default function RecoveryJobs() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecoveryJobStatus | ''>('');
  const { data, isLoading } = useRecoveryJobs();

  const jobs = (data?.data ?? []).filter((j) => {
    if (statusFilter && j.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return j.appointmentTypeName.toLowerCase().includes(q) || j.locationName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by type or location..."
            className="pl-8 w-56"
          />
        </div>
        <Select
          value={statusFilter || '_all'}
          onValueChange={(v) => setStatusFilter(v === '_all' ? '' : v as RecoveryJobStatus)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value || '_all'} value={o.value || '_all'}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slot</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Slot Time</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Candidates</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Started</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Winner</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No recovery jobs found
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/recovery-jobs/${job.id}`} className="hover:underline font-medium">
                      {job.appointmentTypeName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{job.locationName}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {formatDateTime(job.slotTime)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-center">
                    <span className="text-sm">{job.candidates.length}</span>
                  </td>
                  <td className="px-4 py-3">
                    <RecoveryStatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                    {formatRelative(job.createdAt)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm">
                    {job.winnerCustomerName ?? <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
