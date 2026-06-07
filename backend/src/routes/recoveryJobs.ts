import { Router } from 'express';
import { col, now, toIso, docJson } from '../lib/firebase';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/error';
import { EscalateJobSchema } from '../schemas';
import { RecoveryJob, CallAttempt } from '../types';

const JOB_TS     = ['slotTime', 'createdAt', 'updatedAt', 'completedAt'];
const ATTEMPT_TS = ['initiatedAt', 'completedAt', 'callbackScheduledAt'];
const router = Router();

// Static routes before /:id
router.get('/active', async (_req, res, next) => {
  try {
    const snap = await col.recoveryJobs
      .where('status', 'in', ['PENDING', 'IN_PROGRESS', 'CALLBACK_REQUESTED'])
      .get();
    const data = snap.docs
      .map((d) => docJson<RecoveryJob>(d, JOB_TS))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ data, total: data.length });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    let query = col.recoveryJobs as FirebaseFirestore.Query;
    if (req.query.status)     query = query.where('status', '==', req.query.status);
    if (req.query.locationId) query = query.where('locationId', '==', req.query.locationId);

    const snap = await query.limit(100).get();
    const data = snap.docs
      .map((d) => docJson<RecoveryJob>(d, JOB_TS))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ data, total: data.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await col.recoveryJobs.doc(req.params.id).get();
    if (!doc.exists) throw new AppError(404, 'Recovery job not found', 'NOT_FOUND');

    const job = docJson<RecoveryJob>(doc, JOB_TS);

    const attemptsSnap = await col.callAttempts
      .where('recoveryJobId', '==', req.params.id)
      .get();
    job.callAttempts = attemptsSnap.docs
      .map((d) => docJson<CallAttempt>(d, ATTEMPT_TS))
      .sort((a, b) => a.initiatedAt.localeCompare(b.initiatedAt));

    if (Array.isArray(job.candidates)) {
      job.candidates = job.candidates.map((c) => ({
        ...c,
        lastAttemptAt: c.lastAttemptAt ? toIso(c.lastAttemptAt) : undefined,
        contactedAt:   c.contactedAt   ? toIso(c.contactedAt)   : undefined,
      }));
    }

    res.json(job);
  } catch (err) { next(err); }
});

router.post('/:id/escalate', validateBody(EscalateJobSchema), async (req, res, next) => {
  try {
    const ref = col.recoveryJobs.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) throw new AppError(404, 'Recovery job not found', 'NOT_FOUND');

    await ref.update({
      status:           'ESCALATED',
      escalationReason: req.body.reason ?? 'Manual escalation',
      updatedAt:        now(),
    });

    const updated = await ref.get();
    res.json(docJson<RecoveryJob>(updated, JOB_TS));
  } catch (err) { next(err); }
});

export default router;
