import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { RecoveryJob } from '@/types';

interface Props {
  jobs: RecoveryJob[];
}

export function EscalationAlert({ jobs }: Props) {
  const escalated = jobs.filter((j) => j.status === 'ESCALATED');
  if (escalated.length === 0) return null;

  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{escalated.length} Recovery Job{escalated.length > 1 ? 's' : ''} Need Attention</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-1">
          {escalated.slice(0, 3).map((job) => (
            <div key={job.id} className="flex items-center justify-between text-sm">
              <span>{job.appointmentTypeName} — {job.locationName}</span>
              <Link
                to={`/recovery-jobs/${job.id}`}
                className="flex items-center gap-1 text-amber-700 underline hover:text-amber-900"
              >
                Review <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ))}
          {escalated.length > 3 && (
            <Link to="/recovery-jobs?status=ESCALATED" className="text-sm text-amber-700 underline">
              +{escalated.length - 3} more
            </Link>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
