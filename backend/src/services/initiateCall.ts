import { col, now, toIso } from '../lib/firebase';
import { fonioClient } from '../lib/fonio';
import { buildCustomerContext } from './buildCustomerContext';
import { Appointment } from '../types';

function ts() { return new Date().toISOString().slice(11, 23); }
function banner(label: string) { console.log(`\n${ts()} ──── ${label} ${'─'.repeat(Math.max(0, 50 - label.length))}`); }

export async function initiateCall(
  jobId: string,
  candidateIndex: number,
  appointment: Appointment
): Promise<string> {
  banner('CALL INITIATING');
  console.log(`${ts()} [initiateCall] job=${jobId} candidateIndex=${candidateIndex} appointmentId=${appointment.id} type="${appointment.appointmentTypeName}" slot=${toIso(appointment.startTime).slice(0, 16)}`);

  const jobDoc = await col.recoveryJobs.doc(jobId).get();
  const job = jobDoc.data();
  if (!job) throw new Error(`[initiateCall] Recovery job ${jobId} not found`);

  // Guard: don't call if the job already finished (e.g. from a duplicate webhook or race)
  if (job.status !== 'IN_PROGRESS') {
    console.warn(`${ts()} [initiateCall] SKIPPED — job ${jobId} status=${job.status} (not IN_PROGRESS)`);
    return '';
  }

  const candidate = job.candidates[candidateIndex];
  if (!candidate) throw new Error(`[initiateCall] Candidate ${candidateIndex} not found in job ${jobId}`);

  const retryCount = candidate.retryCount ?? 0;
  const attemptNumber = retryCount + 1;
  console.log(`${ts()} [initiateCall] Candidate ${candidateIndex + 1}/${job.candidates.length} — name="${candidate.customerName}" phone=${candidate.customerPhone} attemptNumber=${attemptNumber} (retryCount=${retryCount})`);

  // const settingsDoc = await col.settings.doc('default').get();
  // const settings = settingsDoc.data() ?? {};
  // const systemPrompt = settings.aiSystemPrompt || DEFAULT_PROMPT;

  const customerCtx = await buildCustomerContext(candidate.customerId);

  const attemptRef = col.callAttempts.doc();
  const callAttemptId = attemptRef.id;

  // Create the attempt doc BEFORE calling Fonio — avoids a race condition where
  // a very short call triggers the webhook before the doc exists.
  await attemptRef.set({
    recoveryJobId: jobId,
    customerId: candidate.customerId,
    customerName: candidate.customerName,
    customerPhone: candidate.customerPhone,
    appointmentId: appointment.id,
    fonioCallId: callAttemptId,
    status: 'INITIATED',
    attemptNumber,
    initiatedAt: now(),
  });
  console.log(`${ts()} [initiateCall] Attempt doc created — attemptId=${callAttemptId}`);

  const payload = {
    apiKey: process.env.FONIO_API_KEY,
    fromNumber: process.env.FONIO_PHONE_NUMBER,
    toNumber: candidate.customerPhone,
    agentId: process.env.FONIO_AGENT_ID,
    context: {
      customerName: candidate.customerName,
      lastVisit: customerCtx.lastVisit,
      preferredTime: customerCtx.preferredTime,
      appointmentType: appointment.appointmentTypeName,
      appointmentTime: toIso(appointment.startTime),
      notes: appointment.notes,
    },
  };

  console.log(`${ts()} [initiateCall] Calling Fonio — from=${payload.fromNumber} to=${payload.toNumber} agentId=${payload.agentId}`);
  console.log(`${ts()} [initiateCall] Context — customerName="${candidate.customerName}" lastVisit=${customerCtx.lastVisit ?? 'none'} preferredTime=${customerCtx.preferredTime} appointmentType="${appointment.appointmentTypeName}"`);

  let fonioResponse: unknown;
  try {
    const res = await fonioClient.post('/api/public/v1/outbound_call', payload);
    fonioResponse = res.data;
    console.log(`${ts()} [initiateCall] Fonio accepted — response: ${JSON.stringify(fonioResponse)}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${ts()} [initiateCall] ERROR — Fonio API rejected call: ${msg}`);
    await attemptRef.update({ status: 'FAILED', failureReason: msg });
    throw err;
  }

  const updatedCandidates = [...job.candidates];
  updatedCandidates[candidateIndex] = {
    ...candidate,
    status: 'CONTACTED',
    retryCount: attemptNumber - 1,
    callAttemptIds: [...(candidate.callAttemptIds ?? []), callAttemptId],
    lastAttemptAt: toIso(now()),
    contactedAt: candidate.contactedAt ?? toIso(now()),
  };

  await col.recoveryJobs.doc(jobId).update({
    candidates: updatedCandidates,
    totalAttempts: (job.totalAttempts ?? 0) + 1,
    updatedAt: now(),
  });

  console.log(`${ts()} [initiateCall] Job updated — totalAttempts=${(job.totalAttempts ?? 0) + 1}`);
  banner('CALL PLACED — AWAITING OUTCOME');
  console.log(`${ts()} [initiateCall] job=${jobId} candidate="${candidate.customerName}" attemptId=${callAttemptId}\n`);
  return callAttemptId;
}
