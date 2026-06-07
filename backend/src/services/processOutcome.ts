import { col, now, toIso } from '../lib/firebase';
import { initiateCall } from './initiateCall';
import { createRecoveryJob } from './createRecoveryJob';
import { createCalcomBooking } from './createCalcomBooking';
import { cancelCalcomBooking } from './cancelCalcomBooking';
import { CallOutcome, Appointment } from '../types';

export interface FonioWebhookPayload {
  id: string;
  toNumber?: string | null;
  endTimestamp?: string;
  duration?: number;
  disconnectReason?: string | null;
  summary?: string;
  formattedTranscript?: string;
  extractionData: {
    callOutcome: CallOutcome;
    callbackRequested?: boolean | null;
    callbackTime?: string | null;
    voicemailReached?: boolean | null;
    acceptanceConfirmed?: boolean | null;
    declineReason?: string | null;
    technicalFailure?: boolean | null;
    failureReason?: string | null;
    customerResponse?: string | null;
  };
}

export async function processOutcome(webhook: FonioWebhookPayload): Promise<void> {
  const { id: fonioCallId, toNumber, endTimestamp, extractionData } = webhook;
  const outcome = extractionData.callOutcome;

  console.log(`[processOutcome] START — fonioCallId=${fonioCallId} outcome=${outcome} toNumber=${toNumber ?? 'null'} duration=${webhook.duration ?? 'unknown'}s`);
  console.log(`[processOutcome] ExtractionData — ${JSON.stringify(extractionData)}`);

  // ── Match the call attempt ──────────────────────────────────────────────────
  // Fonio does not echo back our context, so we match by toNumber → customerPhone.
  let attemptDoc: FirebaseFirestore.DocumentSnapshot | null = null;

  if (toNumber) {
    console.log(`[processOutcome] Matching by toNumber=${toNumber}`);
    const snap = await col.callAttempts
      .where('customerPhone', '==', toNumber)
      .where('status', '==', 'INITIATED')
      .get();

    console.log(`[processOutcome] Phone match query returned ${snap.size} docs`);

    if (!snap.empty) {
      const sorted = snap.docs.sort((a, b) => {
        const aMs = a.data().initiatedAt?.toDate?.()?.getTime() ?? 0;
        const bMs = b.data().initiatedAt?.toDate?.()?.getTime() ?? 0;
        return bMs - aMs;
      });
      attemptDoc = sorted[0];
      console.log(`[processOutcome] Matched attempt by phone — attemptId=${attemptDoc.id}`);
    }
  } else {
    console.warn(`[processOutcome] toNumber is null — falling back to most recent INITIATED attempt`);
  }

  if (!attemptDoc) {
    console.log(`[processOutcome] Fallback: querying all INITIATED attempts`);
    const snap = await col.callAttempts.where('status', '==', 'INITIATED').get();
    console.log(`[processOutcome] Fallback query returned ${snap.size} INITIATED attempts`);

    if (!snap.empty) {
      const sorted = snap.docs.sort((a, b) => {
        const aMs = a.data().initiatedAt?.toDate?.()?.getTime() ?? 0;
        const bMs = b.data().initiatedAt?.toDate?.()?.getTime() ?? 0;
        return bMs - aMs;
      });
      attemptDoc = sorted[0];
      const d = attemptDoc.data()!;
      console.log(`[processOutcome] Fallback matched — attemptId=${attemptDoc.id} customerName=${d.customerName} phone=${d.customerPhone}`);
    }
  }

  if (!attemptDoc) {
    console.error(`[processOutcome] FAILED TO MATCH — no INITIATED callAttempt found for fonioCallId=${fonioCallId}. Webhook dropped.`);
    return;
  }

  const attempt = attemptDoc.data()!;
  console.log(`[processOutcome] Attempt matched — attemptId=${attemptDoc.id} recoveryJobId=${attempt.recoveryJobId} appointmentId=${attempt.appointmentId}`);

  // ── Update call attempt ─────────────────────────────────────────────────────
  await attemptDoc.ref.update({
    status: 'COMPLETED',
    outcome,
    fonioCallId,
    completedAt: endTimestamp ?? toIso(now()),
    declineReason: extractionData.declineReason ?? null,
    customerResponse: extractionData.customerResponse ?? null,
    callbackTime: extractionData.callbackTime ?? null,
    transcript: webhook.formattedTranscript ?? null,
    duration: webhook.duration ?? null,
  });
  console.log(`[processOutcome] Attempt doc updated to COMPLETED`);

  // ── Load recovery job ───────────────────────────────────────────────────────
  const jobDoc = await col.recoveryJobs.doc(attempt.recoveryJobId).get();
  if (!jobDoc.exists) {
    console.error(`[processOutcome] Recovery job ${attempt.recoveryJobId} not found — cannot advance`);
    return;
  }

  const job = jobDoc.data()!;
  const idx = job.currentCandidateIndex as number;
  const candidates = [...(job.candidates as Record<string, unknown>[])];
  const candidate = candidates[idx];

  console.log(`[processOutcome] Job=${attempt.recoveryJobId} status=${job.status} currentCandidateIndex=${idx} totalCandidates=${candidates.length}`);
  console.log(`[processOutcome] Current candidate — name=${candidate.customerName} retryCount=${candidate.retryCount ?? 0}`);

  // ── Settings ────────────────────────────────────────────────────────────────
  const settingsDoc = await col.settings.doc('default').get();
  const maxRetries: number = (settingsDoc.data()?.maxRetries as number) ?? 2;
  console.log(`[processOutcome] maxRetries=${maxRetries}`);

  // ── Contact history ─────────────────────────────────────────────────────────
  await col.contactHistory.add({
    customerId: candidate.customerId,
    outcome,
    recoveryJobId: attempt.recoveryJobId,
    callAttemptId: attemptDoc.id,
    declineReason: extractionData.declineReason ?? null,
    customerResponse: extractionData.customerResponse ?? null,
    createdAt: now(),
  });
  console.log(`[processOutcome] Contact history entry written`);

  // ── Load appointment ────────────────────────────────────────────────────────
  const apptDoc = await col.appointments.doc(attempt.appointmentId).get();
  const appt = { id: apptDoc.id, ...apptDoc.data() } as Appointment;
  console.log(`[processOutcome] Appointment loaded — id=${appt.id} type=${appt.appointmentTypeName}`);

  // ── Route by outcome ────────────────────────────────────────────────────────
  console.log(`[processOutcome] Routing outcome=${outcome}`);

  switch (outcome) {
    case 'ACCEPTED': {
      console.log(`[processOutcome] ACCEPTED — marking job SUCCESS, recovering appointment`);
      candidates[idx] = { ...candidate, status: 'ACCEPTED' };
      await jobDoc.ref.update({
        candidates,
        status: 'SUCCESS',
        winnerCustomerId: candidate.customerId,
        winnerCustomerName: candidate.customerName,
        completedAt: now(),
        updatedAt: now(),
      });
      await col.appointments.doc(attempt.appointmentId).update({
        status: 'RECOVERED',
        recoveredAt: now(),
        customerId: candidate.customerId,
        customerName: candidate.customerName,
        customerPhone: candidate.customerPhone,
        updatedAt: now(),
      });
      // Create a Cal.com booking for the winner at the recovered (earlier) slot.
      // Awaited so calcomBookingUid is stored before Cal.com fires BOOKING_CREATED —
      // without this the webhook handler sees no existing appointment and creates a
      // duplicate BOOKED entry that triggers a spurious recovery cascade.
      try {
        const winnerUid = await createCalcomBooking({
          customerName: candidate.customerName as string,
          customerPhone: candidate.customerPhone as string,
          startTime: toIso(appt.startTime),
        });
        console.log(`[processOutcome] Cal.com booking created for winner — uid=${winnerUid}`);
        await col.appointments.doc(attempt.appointmentId).update({ calcomBookingUid: winnerUid });
      } catch (err) {
        console.error(`[processOutcome] Cal.com booking failed for winner (non-fatal):`, err);
      }

      const originalId = candidate.originalAppointmentId as string | undefined;
      console.log(`[processOutcome] Winner's original appointment — originalId=${originalId ?? 'none'}`);
      if (originalId) {
        const originalDoc = await col.appointments.doc(originalId).get();
        const originalCalcomUid = originalDoc.data()?.calcomBookingUid as string | undefined;

        await col.appointments.doc(originalId).update({
          status: 'CANCELLED',
          cancelledAt: now(),
          cancelledBy: 'system-slot-upgrade',
          updatedAt: now(),
        });
        console.log(`[processOutcome] Original appointment ${originalId} cancelled, starting cascade recovery`);

        // Cancel the winner's old Cal.com booking
        if (originalCalcomUid) {
          cancelCalcomBooking(originalCalcomUid, 'Patient upgraded to earlier slot').catch((err) =>
            console.error(`[processOutcome] Cal.com cancel failed for original booking ${originalCalcomUid}:`, err)
          );
        }

        createRecoveryJob(originalId).catch((err) =>
          console.error(`[processOutcome] Cascade recovery failed for ${originalId}:`, err)
        );
      }
      console.log(`[processOutcome] DONE — job ${jobDoc.id} SUCCESS`);
      break;
    }

    case 'DECLINED': {
      console.log(`[processOutcome] DECLINED — reason="${extractionData.declineReason ?? 'none'}", moving to next candidate`);
      candidates[idx] = { ...candidate, status: 'DECLINED' };
      await moveToNext(jobDoc.id, idx, candidates, job, appt);
      break;
    }

    case 'NO_ANSWER':
    case 'VOICEMAIL': {
      const retryCount = ((candidate.retryCount as number) ?? 0) + 1;
      console.log(`[processOutcome] ${outcome} — retryCount=${retryCount} maxRetries=${maxRetries}`);
      candidates[idx] = { ...candidate, status: outcome, retryCount };

      if (retryCount < maxRetries) {
        console.log(`[processOutcome] Retrying same candidate (attempt ${retryCount + 1})`);
        await jobDoc.ref.update({ candidates, updatedAt: now() });
        await initiateCall(jobDoc.id, idx, appt);
      } else {
        console.log(`[processOutcome] Candidate ${idx} exhausted after ${retryCount} attempts — moving to next`);
        candidates[idx] = { ...candidates[idx], status: 'EXHAUSTED' };
        await moveToNext(jobDoc.id, idx, candidates, job, appt);
      }
      break;
    }

    case 'CALLBACK_REQUESTED': {
      console.log(`[processOutcome] CALLBACK_REQUESTED — callbackTime="${extractionData.callbackTime ?? 'unspecified'}", pausing job`);
      candidates[idx] = {
        ...candidate,
        status: 'CALLBACK_REQUESTED',
        callbackTime: extractionData.callbackTime ?? null,
      };
      await jobDoc.ref.update({
        candidates,
        status: 'CALLBACK_REQUESTED',
        updatedAt: now(),
      });
      break;
    }

    case 'FAILED': {
      console.error(`[processOutcome] FAILED — reason="${extractionData.failureReason ?? 'unknown'}", escalating job`);
      await jobDoc.ref.update({
        status: 'ESCALATED',
        escalationReason: extractionData.failureReason ?? 'Fonio call failure',
        updatedAt: now(),
      });
      break;
    }
  }
}

async function moveToNext(
  jobId: string,
  currentIdx: number,
  candidates: Record<string, unknown>[],
  job: Record<string, unknown>,
  appt: Appointment
): Promise<void> {
  const nextIdx = currentIdx + 1;
  console.log(`[moveToNext] jobId=${jobId} currentIdx=${currentIdx} nextIdx=${nextIdx} totalCandidates=${candidates.length}`);

  if (nextIdx < candidates.length) {
    const next = candidates[nextIdx] as Record<string, unknown>;
    console.log(`[moveToNext] Advancing to candidate ${nextIdx} — name=${next.customerName}`);
    await col.recoveryJobs.doc(jobId).update({
      candidates,
      currentCandidateIndex: nextIdx,
      updatedAt: now(),
    });
    await initiateCall(jobId, nextIdx, appt);
  } else {
    console.warn(`[moveToNext] No more candidates — marking job ${jobId} FAILED`);
    await col.recoveryJobs.doc(jobId).update({
      candidates,
      status: 'FAILED',
      completedAt: now(),
      updatedAt: now(),
    });
  }
}
