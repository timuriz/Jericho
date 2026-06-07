import { useState } from 'react';
import { Phone, CheckCircle, XCircle, Clock, VoicemailIcon, PhoneCall, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
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

type TranscriptLine =
  | { speaker: 'agent'; text: string }
  | { speaker: 'customer'; text: string }
  | { speaker: 'unknown'; text: string };

function parseTranscript(raw: string): TranscriptLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): TranscriptLine => {
      const agentMatch = line.match(/^(Agent|Assistant|AI|Bot)\s*:\s*/i);
      if (agentMatch) return { speaker: 'agent', text: line.slice(agentMatch[0].length).trim() };
      const customerMatch = line.match(/^(Customer|Patient|User|Caller)\s*:\s*/i);
      if (customerMatch) return { speaker: 'customer', text: line.slice(customerMatch[0].length).trim() };
      return { speaker: 'unknown', text: line };
    });
}

function TranscriptBubble({ line }: { line: TranscriptLine }) {
  if (line.speaker === 'agent') {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[10px] font-medium text-blue-500 pr-1">Agent</span>
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-3 py-2 text-xs text-white shadow-sm">
          {line.text}
        </div>
      </div>
    );
  }
  if (line.speaker === 'customer') {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[10px] font-medium text-gray-400 pl-1">Customer</span>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 shadow-sm">
          {line.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <span className="text-[10px] text-muted-foreground italic">{line.text}</span>
    </div>
  );
}

interface Props {
  attempt: CallAttempt;
}

export function CallAttemptItem({ attempt }: Props) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const hasTranscript = !!attempt.transcript;
  const lines = hasTranscript && transcriptOpen ? parseTranscript(attempt.transcript!) : [];

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start gap-3">
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

        {hasTranscript && (
          <button
            onClick={() => setTranscriptOpen((o) => !o)}
            className="flex items-center gap-1 shrink-0 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {transcriptOpen ? (
              <>Hide transcript <ChevronUp className="h-3.5 w-3.5" /></>
            ) : (
              <>View transcript <ChevronDown className="h-3.5 w-3.5" /></>
            )}
          </button>
        )}
      </div>

      {transcriptOpen && hasTranscript && (
        <div className="ml-11 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-white p-3 space-y-2">
          {lines.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No transcript lines found.</p>
          ) : (
            lines.map((line, i) => <TranscriptBubble key={i} line={line} />)
          )}
        </div>
      )}
    </div>
  );
}
