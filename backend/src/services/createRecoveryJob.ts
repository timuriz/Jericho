import { col, now, toIso } from '../lib/firebase';
import { rankCandidates } from './rankCandidates';
import { initiateCall } from './initiateCall';
import { Appointment, CallOutcome } from '../types';

export async function createRecoveryJob(appointmentId: string): Promise<void> {
  console.log(`[createRecoveryJob] START — appointmentId=${appointmentId}`);

  const apptDoc = await col.appointments.doc(appointmentId).get();
  if (!apptDoc.exists) throw new Error(`[createRecoveryJob] Appointment ${appointmentId} not found`);

  const appt = { id: apptDoc.id, ...apptDoc.data() } as Appointment;
  const cancelledSlotTime = new Date(toIso(appt.startTime));
  console.log(`[createRecoveryJob] Cancelled slot — type=${appt.appointmentTypeName} location=${appt.locationName} time=${cancelledSlotTime.toISOString()}`);

  const snap = await col.appointments
    .where('status', '==', 'BOOKED')
    .where('appointmentTypeId', '==', appt.appointmentTypeId)
    .where('locationId', '==', appt.locationId)
    .where('wantsEarlierSlot', '==', true)
    .get();

  console.log(`[createRecoveryJob] BOOKED+wantsEarlierSlot query returned ${snap.size} appointments`);

  const eligible = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Appointment)
    .filter((a) => a.id !== appointmentId && new Date(toIso(a.startTime)) > cancelledSlotTime);

  console.log(`[createRecoveryJob] Eligible after time filter — ${eligible.length} candidates`);
  eligible.forEach((a) => console.log(`  - ${a.customerName} (${a.id}) scheduled ${toIso(a.startTime).slice(0, 10)}`));

  const contactHistory: Record<string, { lastOutcome: CallOutcome | null; noAnswerStreak: number }> = {};
  if (eligible.length > 0) {
    const customerIds = [...new Set(eligible.map((a) => a.customerId))];
    const chunks: string[][] = [];
    for (let i = 0; i < customerIds.length; i += 30) chunks.push(customerIds.slice(i, i + 30));

    console.log(`[createRecoveryJob] Fetching contact history for ${customerIds.length} customers in ${chunks.length} chunk(s)`);

    for (const chunk of chunks) {
      // No orderBy here — composite index not set up. Sort in memory.
      const histSnap = await col.contactHistory
        .where('customerId', 'in', chunk)
        .get();

      const sorted = histSnap.docs.sort((a, b) => {
        const aMs = a.data().createdAt?.toDate?.()?.getTime() ?? 0;
        const bMs = b.data().createdAt?.toDate?.()?.getTime() ?? 0;
        return bMs - aMs;
      });

      for (const doc of sorted) {
        const d = doc.data();
        const cid = d.customerId as string;
        if (!contactHistory[cid]) {
          contactHistory[cid] = { lastOutcome: d.outcome as CallOutcome, noAnswerStreak: 0 };
        }
        if (d.outcome === 'NO_ANSWER' || d.outcome === 'VOICEMAIL') {
          contactHistory[cid].noAnswerStreak++;
        }
      }
    }
    console.log(`[createRecoveryJob] Contact history loaded — ${Object.keys(contactHistory).length} customers have history`);
  }

  const ranked = rankCandidates(eligible, cancelledSlotTime, contactHistory);
  console.log(`[createRecoveryJob] Ranked candidates:`);
  ranked.forEach((c, i) => console.log(`  [${i}] ${c.customerName} score=${c.score} originalAppointmentId=${c.originalAppointmentId}`));

  const candidates = ranked.map((c) => ({
    customerId: c.customerId,
    customerName: c.customerName,
    customerPhone: c.customerPhone,
    score: c.score,
    originalAppointmentId: c.originalAppointmentId,
    status: 'PENDING',
    retryCount: 0,
    callAttemptIds: [],
  }));

  const jobRef = col.recoveryJobs.doc();
  await jobRef.set({
    appointmentId,
    appointmentTypeId: appt.appointmentTypeId,
    appointmentTypeName: appt.appointmentTypeName,
    locationId: appt.locationId,
    locationName: appt.locationName,
    slotTime: appt.startTime,
    status: candidates.length > 0 ? 'IN_PROGRESS' : 'FAILED',
    currentCandidateIndex: 0,
    candidates,
    totalAttempts: 0,
    price: appt.price,
    createdAt: now(),
    updatedAt: now(),
  });

  await col.appointments.doc(appointmentId).update({ recoveryJobId: jobRef.id });
  console.log(`[createRecoveryJob] Job created — jobId=${jobRef.id} status=${candidates.length > 0 ? 'IN_PROGRESS' : 'FAILED'} candidates=${candidates.length}`);

  if (candidates.length === 0) {
    console.warn(`[createRecoveryJob] No eligible candidates — job marked FAILED immediately`);
    return;
  }

  console.log(`[createRecoveryJob] Firing first call for candidate 0 — ${candidates[0].customerName}`);
  initiateCall(jobRef.id, 0, appt)
    .catch((err) => console.error(`[createRecoveryJob] Failed to initiate first call for job ${jobRef.id}:`, err));
}
