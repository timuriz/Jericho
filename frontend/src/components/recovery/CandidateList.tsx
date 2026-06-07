import { Phone, Clock, RotateCcw, Trophy } from 'lucide-react';
import { RecoveryStatusBadge } from './RecoveryStatusBadge';
import { formatRelative, formatPhone, getInitials } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { RecoveryCandidate } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  candidates: RecoveryCandidate[];
  currentIndex: number;
}

export function CandidateList({ candidates, currentIndex }: Props) {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Phone className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No candidates found for this slot</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {candidates.map((candidate, index) => {
          const isCurrent = index === currentIndex && candidate.status === 'CONTACTED';
          return (
            <div
              key={candidate.customerId}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                isCurrent ? 'border-blue-200 bg-blue-50' : 'bg-card',
                candidate.status === 'ACCEPTED' ? 'border-green-200 bg-green-50' : ''
              )}
            >
              {/* Rank badge */}
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
              )}>
                {index === 0 ? <Trophy className="h-3.5 w-3.5" /> : index + 1}
              </div>

              {/* Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(candidate.customerName)}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{candidate.customerName}</p>
                <p className="text-xs text-muted-foreground">{formatPhone(candidate.customerPhone)}</p>
              </div>

              {/* Score */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-foreground">{candidate.score}</span>
                    <span className="text-xs text-muted-foreground">score</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Priority score based on time preference, waitlist age, and history</TooltipContent>
              </Tooltip>

              {/* Retry count */}
              {candidate.retryCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <RotateCcw className="h-3 w-3" />
                  <span>{candidate.retryCount}</span>
                </div>
              )}

              {/* Status + last attempt */}
              <div className="flex flex-col items-end gap-1">
                <RecoveryStatusBadge status={candidate.status} />
                {candidate.lastAttemptAt && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelative(candidate.lastAttemptAt)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
