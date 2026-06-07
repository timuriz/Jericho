import { Link } from 'react-router-dom';
import { Phone, Clock, ArrowRight, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RecoveryStatusBadge } from '@/components/recovery/RecoveryStatusBadge';
import { formatDateTime, formatRelative, formatCurrency } from '@/lib/utils';
import { useActiveRecoveryJobsRealtime } from '@/hooks/useRecoveryJobs';
import type { RecoveryJob } from '@/types';

function RecoveryJobCard({ job }: { job: RecoveryJob }) {
  const currentCandidate =
    job.status === 'IN_PROGRESS'
      ? job.candidates.find((c) => c.status === 'CONTACTED') ?? job.candidates[job.currentCandidateIndex]
      : null;

  return (
    <Link to={`/recovery-jobs/${job.id}`} className="block">
      <div className="flex items-start gap-3 rounded-lg border bg-card p-3 hover:border-primary/50 hover:bg-accent/30 transition-colors">
        {/* Pulse indicator */}
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Phone className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{job.appointmentTypeName}</p>
              <p className="text-xs text-muted-foreground truncate">{job.locationName}</p>
            </div>
            <RecoveryStatusBadge status={job.status} />
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateTime(job.slotTime)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {job.candidates.length} candidates
            </span>
            <span>{formatCurrency(job.price)}</span>
          </div>

          {currentCandidate && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-700">Calling {currentCandidate.customerName}</span>
            </div>
          )}

          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatRelative(job.createdAt)}
          </div>
        </div>

        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-1" />
      </div>
    </Link>
  );
}

export function ActiveRecoveryFeed() {
  const { jobs, loading, error } = useActiveRecoveryJobsRealtime();

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="live-dot" />
            Active Recoveries
          </CardTitle>
          <span className="text-sm text-muted-foreground">{jobs.length} active</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-4 pt-0">
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-red-600">Failed to load recovery jobs</p>
            <p className="text-xs text-muted-foreground mt-1">Check your Firebase connection</p>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Phone className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No active recoveries</p>
            <p className="text-xs text-muted-foreground mt-1">Cancel an appointment to start recovery</p>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <div className="space-y-2">
            {jobs.map((job) => (
              <RecoveryJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
