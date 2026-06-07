import { col, now, toIso } from '../lib/firebase';
import { rankCandidatesAI, CandidateInput } from './rankCandidatesAI';
import { initiateCall } from './initiateCall';
import { Appointment, Customer, ContactHistoryEntry } from '../types';

function ts() { return new Date().toISOString().slice(11, 23); }
function banner(label: string) { console.log(`\n${ts()} #### ${label} ${'#'.repeat(Math.max(0, 50 - label.length))}`); }

export async function createRecoveryJob(appointmentId: string): Promise<void> {
  banner('RECOVERY JOB CREATING');
  console.log(`${ts()} [createRecoveryJob] appointmentId=${appointmentId}`);

  const apptDoc = await col.appointments.doc(appointmentId).get();
  if (!apptDoc.exists) throw new Error(`[createRecoveryJob] Appointment ${appointmentId} not found`);

  const appt = { id: apptDoc.id, ...apptDoc.data() } as Appointment;

  // Don't create a recovery job for slots freed by a previous recovery winner (system-slot-upgrade).
  // This prevents the infinite call chain: winner frees their old slot → recovery calls everyone again.
  if ((appt as any).cancelledBy === 'system-slot-upgrade') {
    console.log(`${ts()} [createRecoveryJob] SKIP — appointment ${appointmentId} was freed by a recovery winner (system-slot-upgrade). Slot is available but no auto-recovery.`);
    return;
  }

  // Guard against duplicate recovery jobs (e.g. race between Jericho cancel + Cal.com webhook).
  const existingSnap = await col.recoveryJobs
    .where('appointmentId', '==', appointmentId)
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0];
    console.log(`${ts()} [createRecoveryJob] SKIP — recovery job ${existing.id} already exists for appointment ${appointmentId} (status=${existing.data().status})`);
    return;
  }

  const cancelledSlotTime = new Date(toIso(appt.startTime));
  console.log(`${ts()} [createRecoveryJob] Cancelled slot — type="${appt.appointmentTypeName}" location="${appt.locationName}" time=${cancelledSlotTime.toISOString()}`);

  const snap = await col.appointments
    .where('status', '==', 'BOOKED')
    .where('appointmentTypeId', '==', appt.appointmentTypeId)
    .where('locationId', '==', appt.locationId)
    .where('wantsEarlierSlot', '==', true)
    .get();

  console.log(`${ts()} [createRecoveryJob] BOOKED+wantsEarlierSlot query — ${snap.size} result(s)`);

  const eligible = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Appointment)
    .filter((a) => a.id !== appointmentId && new Date(toIso(a.startTime)) > cancelledSlotTime);

  console.log(`${ts()} [createRecoveryJob] Eligible after time filter — ${eligible.length} candidate(s)`);
  eligible.forEach((a) => console.log(`${ts()}   - "${a.customerName}" (${a.id}) booked for ${toIso(a.startTime).slice(0, 10)}`));

  // ── Fetch full contact history per candidate ────────────────────────────────
  const historyByCustomer: Record<string, Pick<ContactHistoryEntry, 'outcome' | 'createdAt'>[]> = {};
  if (eligible.length > 0) {
    const customerIds = [...new Set(eligible.map((a) => a.customerId))];
    const chunks: string[][] = [];
    for (let i = 0; i < customerIds.length; i += 30) chunks.push(customerIds.slice(i, i + 30));

    console.log(`${ts()} [createRecoveryJob] Fetching contact history for ${customerIds.length} customers in ${chunks.length} chunk(s)`);

    for (const chunk of chunks) {
      const histSnap = await col.contactHistory.where('customerId', 'in', chunk).get();
      for (const doc of histSnap.docs) {
        const d = doc.data();
        const cid = d.customerId as string;
        if (!historyByCustomer[cid]) historyByCustomer[cid] = [];
        historyByCustomer[cid].push({
          outcome: d.outcome,
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        });
      }
    }

    // Sort each customer's history newest-first (required by reachability score)
    for (const cid of Object.keys(historyByCustomer)) {
      historyByCustomer[cid].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    console.log(`${ts()} [createRecoveryJob] Contact history loaded — ${Object.keys(historyByCustomer).length} customers have prior history`);
  }

  // ── Fetch customer profiles in batch ───────────────────────────────────────
  const customerMap: Record<string, Customer> = {};
  if (eligible.length > 0) {
    const customerIds = [...new Set(eligible.map((a) => a.customerId))];
    const chunks: string[][] = [];
    for (let i = 0; i < customerIds.length; i += 30) chunks.push(customerIds.slice(i, i + 30));

    for (const chunk of chunks) {
      const custSnap = await col.customers.where('__name__', 'in', chunk).get();
      for (const doc of custSnap.docs) {
        customerMap[doc.id] = { id: doc.id, ...doc.data() } as Customer;
      }
    }
    console.log(`${ts()} [createRecoveryJob] Customer profiles loaded — ${Object.keys(customerMap).length} found`);
  }

  // ── Build candidate inputs and AI-rank ─────────────────────────────────────
  const slotTime = cancelledSlotTime;
  const candidateInputs: CandidateInput[] = eligible.map((a) => ({
    appointment: a,
    customer: customerMap[a.customerId],
    historyEntries: historyByCustomer[a.customerId] ?? [],
    daysSaved: (new Date(toIso(a.startTime)).getTime() - slotTime.getTime()) / (1000 * 60 * 60 * 24),
  }));

  const ranked = await rankCandidatesAI(
    candidateInputs,
    slotTime,
    appt.appointmentTypeName,
    appt.locationName,
    appt.price,
  );

  console.log(`${ts()} [createRecoveryJob] AI ranked ${ranked.length} candidate(s):`);
  ranked.forEach((c, i) =>
    console.log(`${ts()}   #${i + 1} "${c.customerName}" score=${c.score} reachability=${c.reachabilityScore} — "${c.aiRankingReason}"`)
  );

  const candidates = ranked.map((c) => ({
    customerId: c.customerId,
    customerName: c.customerName,
    customerPhone: c.customerPhone,
    score: c.score,
    reachabilityScore: c.reachabilityScore,
    aiRankingReason: c.aiRankingReason,
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
  console.log(`${ts()} [createRecoveryJob] Job created — jobId=${jobRef.id} status=${candidates.length > 0 ? 'IN_PROGRESS' : 'FAILED'} candidates=${candidates.length}`);

  if (candidates.length === 0) {
    console.warn(`${ts()} [createRecoveryJob] No eligible candidates found — job marked FAILED immediately`);
    return;
  }

  console.log(`${ts()} [createRecoveryJob] Starting with candidate #1 — "${candidates[0].customerName}"`);
  initiateCall(jobRef.id, 0, appt)
    .catch((err) => console.error(`${ts()} [createRecoveryJob] Failed to initiate first call for job ${jobRef.id}:`, err));
}
