import { formatRelative } from '@/lib/utils';
import { RecoveryStatusBadge } from './RecoveryStatusBadge';
import type { RecoveryJob } from '@/types';

interface Props {
  job: RecoveryJob;
}

interface TimelineEvent {
  time: string;
  label: string;
  description: string;
  type: 'start' | 'call' | 'outcome' | 'end';
}

export function RecoveryTimeline({ job }: Props) {
  const events: TimelineEvent[] = [];

  events.push({
    time: job.createdAt,
    label: 'Recovery Started',
    description: `${job.candidates.length} candidates identified`,
    type: 'start',
  });

  for (const candidate of job.candidates) {
    if (candidate.contactedAt) {
      events.push({
        time: candidate.contactedAt,
        label: `Called ${candidate.customerName}`,
        description: `Score: ${candidate.score} · Attempt #1`,
        type: 'call',
      });
    }
    if (candidate.status !== 'PENDING' && candidate.status !== 'CONTACTED') {
      events.push({
        time: candidate.lastAttemptAt ?? candidate.contactedAt ?? job.createdAt,
        label: candidate.customerName,
        description: `Outcome: ${candidate.status.replace('_', ' ')} · ${candidate.retryCount} retries`,
        type: 'outcome',
      });
    }
  }

  if (job.completedAt) {
    events.push({
      time: job.completedAt,
      label: job.status === 'SUCCESS' ? 'Recovery Complete' : `Recovery ${job.status.charAt(0) + job.status.slice(1).toLowerCase()}`,
      description:
        job.status === 'SUCCESS'
          ? `Booked for ${job.winnerCustomerName}`
          : job.escalationReason ?? 'All candidates exhausted',
      type: 'end',
    });
  }

  events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const dotColor = {
    start: 'bg-blue-500',
    call: 'bg-gray-400',
    outcome: 'bg-amber-500',
    end: job.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500',
  };

  return (
    <div className="relative">
      <div className="absolute left-3.5 top-5 bottom-2 w-px bg-border" />
      <div className="space-y-4">
        {events.map((event, i) => (
          <div key={i} className="relative flex items-start gap-4 pl-9">
            <div className={`absolute left-2.5 top-1 h-2.5 w-2.5 rounded-full border-2 border-background ${dotColor[event.type]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{event.label}</span>
                <span className="text-xs text-muted-foreground">{formatRelative(event.time)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
