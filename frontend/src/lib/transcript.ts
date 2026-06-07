export type TranscriptLine =
  | { speaker: 'agent'; text: string }
  | { speaker: 'customer'; text: string }
  | { speaker: 'unknown'; text: string };

const AGENT_PREFIX = /^(Agent|Assistant|AI|Bot)\s*:\s*/i;
const CUSTOMER_PREFIX = /^(Customer|Patient|User|Caller)\s*:\s*/i;

/** Coerce Firestore / Fonio transcript values into a display string. */
export function normalizeTranscript(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const lines: string[] = [];
    let alternateAgent = true;
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) {
        const label = alternateAgent ? 'Agent' : 'Customer';
        lines.push(`${label}: ${item.trim()}`);
        alternateAgent = !alternateAgent;
        continue;
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const text = [obj.text, obj.content, obj.message, obj.transcript]
          .find((v) => typeof v === 'string' && v.trim()) as string | undefined;
        if (!text?.trim()) continue;
        const role = [obj.role, obj.speaker, obj.type, obj.from]
          .find((v) => typeof v === 'string') as string | undefined;
        const r = role?.toLowerCase() ?? '';
        if (['agent', 'assistant', 'ai', 'bot', 'system'].includes(r)) {
          lines.push(`Agent: ${text.trim()}`);
        } else if (['customer', 'patient', 'user', 'caller', 'human'].includes(r)) {
          lines.push(`Customer: ${text.trim()}`);
        } else {
          lines.push(text.trim());
        }
      }
    }
    return lines.length > 0 ? lines.join('\n') : null;
  }
  return null;
}

export function hasTranscriptContent(value: unknown): boolean {
  return normalizeTranscript(value) != null;
}

export function parseTranscript(raw: unknown): TranscriptLine[] {
  const text = normalizeTranscript(raw);
  if (!text) return [];

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): TranscriptLine => {
      const agentMatch = line.match(AGENT_PREFIX);
      if (agentMatch) return { speaker: 'agent', text: line.slice(agentMatch[0].length).trim() };
      const customerMatch = line.match(CUSTOMER_PREFIX);
      if (customerMatch) return { speaker: 'customer', text: line.slice(customerMatch[0].length).trim() };
      return { speaker: 'unknown', text: line };
    });
}
