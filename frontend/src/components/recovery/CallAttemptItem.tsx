import { Phone, CheckCircle, XCircle, Clock, VoicemailIcon, PhoneCall, AlertCircle } from 'lucide-react';
import { formatDateTime, formatDuration, formatRelative } from '@/lib/utils';
import { RecoveryStatusBadge } from './RecoveryStatusBadge';
import type { CallAttempt } from '@/types';

const OutcomeIcon = ({ outcome }: { outcome: CallAttempt['outcome'] }) => {
  switch (outcome) {
    case 'ACCEPTED': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'DECLINED': return <XCircle className="h-4 w-4 text-red-600" />;
    case 'NO_ANSWER': return <PhoneCall className="h-4 w-4 text-amber-600" />;
    case 'VOICEMAIL': return <VoicemailIcon className="h-4 w-4 text-purple-600" />;
    case 'CALLBACK_REQUESTED': return <Clock className="h-4 w-4 text-indigo-600" />;
    case 'FAILED': return <AlertCircle className="h-4 w-4 text-red-600" />;
    default: return <Phone className="h-4 w-4 text-muted-foreground" />;
  }
};

interface Props {
  attempt: CallAttempt;
}

export function CallAttemptItem({ attempt }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <OutcomeIcon outcome={attempt.outcome} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{attempt.customerName}</p>
          <span className="text-xs text-muted-foreground">Attempt #{attempt.attemptNumber}</span>
          {attempt.outcome && <RecoveryStatusBadge status={attempt.outcome} />}
          {attempt.status === 'IN_PROGRESS' && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Live call
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>{formatDateTime(attempt.initiatedAt)}</span>
          {attempt.duration && <span>· Duration: {formatDuration(attempt.duration)}</span>}
          {attempt.callbackScheduledAt && (
            <span className="text-indigo-600">· Callback: {formatRelative(attempt.callbackScheduledAt)}</span>
          )}
          {attempt.errorMessage && (
            <span className="text-red-600 truncate max-w-xs">· {attempt.errorMessage}</span>
          )}
        </div>
      </div>
    </div>
  );
}
