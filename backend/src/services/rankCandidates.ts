import { Appointment, CallOutcome } from '../types';

interface ContactSummary {
  lastOutcome: CallOutcome | null;
  noAnswerStreak: number;
}

export interface RankedCandidate {
  customerId: string;
  customerName: string;
  customerPhone: string;
  score: number;
  originalAppointmentId: string;
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

// Scores each booked appointment candidate and returns them sorted highest-first.
// Candidates are customers with a later booking who would benefit from the earlier cancelled slot.
// contactHistory maps customerId → their recent call outcomes.
export function rankCandidates(
  candidates: Appointment[],
  cancelledSlotTime: Date,
  contactHistory: Record<string, ContactSummary>
): RankedCandidate[] {
  const scored = candidates.map((appt) => {
    let score = 0;

    // Days saved: the further their current appointment is from the new slot, the more they benefit
    const saved = daysBetween(cancelledSlotTime, new Date(appt.startTime as string));
    score += Math.min(saved, 60);

    // Contact history adjustments
    const history = contactHistory[appt.customerId];
    if (history) {
      if (history.lastOutcome === 'DECLINED') score -= 30;
      if (history.noAnswerStreak >= 2)        score -= 15;
      if (history.lastOutcome === 'ACCEPTED') score += 10;
    }

    return {
      customerId: appt.customerId,
      customerName: appt.customerName,
      customerPhone: appt.customerPhone,
      score: Math.round(score),
      originalAppointmentId: appt.id,
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}
