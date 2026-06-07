import { cn } from '@/lib/utils';
import type { RecoveryJobStatus, CandidateStatus, CallOutcome } from '@/types';

interface Props {
  status: RecoveryJobStatus | CandidateStatus | CallOutcome;
  className?: string;
}

const LABELS: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  NO_ANSWER: 'No Answer',
  CALLBACK_REQUESTED: 'Callback',
  ESCALATED: 'Escalated',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  VOICEMAIL: 'Voicemail',
  CONTACTED: 'Contacted',
  EXHAUSTED: 'Exhausted',
};

const COLORS: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800 border-green-200',
  ACCEPTED: 'bg-green-100 text-green-800 border-green-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  CONTACTED: 'bg-blue-100 text-blue-800 border-blue-200',
  PENDING: 'bg-gray-100 text-gray-700 border-gray-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
  DECLINED: 'bg-red-100 text-red-800 border-red-200',
  ESCALATED: 'bg-orange-100 text-orange-800 border-orange-200',
  NO_ANSWER: 'bg-amber-100 text-amber-800 border-amber-200',
  VOICEMAIL: 'bg-purple-100 text-purple-800 border-purple-200',
  CALLBACK_REQUESTED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  EXHAUSTED: 'bg-gray-100 text-gray-500 border-gray-200',
};

export function RecoveryStatusBadge({ status, className }: Props) {
  const label = LABELS[status] ?? status;
  const color = COLORS[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', color, className)}>
      {status === 'IN_PROGRESS' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
      )}
      {label}
    </span>
  );
}
