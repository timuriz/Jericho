import { Router } from 'express';
import { col, toIso } from '../lib/firebase';
import { AnalyticsOverview, AnalyticsTrend, OutcomeDistribution, CallOutcome } from '../types';

const router = Router();

router.get('/overview', async (_req, res, next) => {
  try {
    const [jobsSnap, attemptsSnap] = await Promise.all([
      col.recoveryJobs.get(),
      col.callAttempts.get(),
    ]);

    const jobs     = jobsSnap.docs.map((d) => d.data());
    const attempts = attemptsSnap.docs.map((d) => d.data());

    const totalCancelled  = jobs.length;
    const totalRecovered  = jobs.filter((j) => j.status === 'SUCCEEDED' || j.status === 'SUCCESS').length;
    const revenueRecovered = jobs
      .filter((j) => j.status === 'SUCCESS')
      .reduce((sum, j) => sum + (j.price as number ?? 0), 0);
    const totalActiveJobs  = jobs.filter((j) => ['PENDING', 'IN_PROGRESS', 'CALLBACK_REQUESTED'].includes(j.status)).length;
    const totalCallAttempts = attempts.length;

    const recoveryRate     = totalCancelled > 0 ? totalRecovered / totalCancelled : 0;
    const avgCallsPerRecovery = totalRecovered > 0 ? totalCallAttempts / totalRecovered : 0;

    const accepted   = attempts.filter((a) => a.outcome === 'ACCEPTED').length;
    const callbacks  = attempts.filter((a) => a.outcome === 'CALLBACK_REQUESTED').length;
    const noAnswers  = attempts.filter((a) => a.outcome === 'NO_ANSWER').length;
    const retried    = attempts.filter((a) => (a.attemptNumber as number) > 1).length;
    const retriedAccepted = attempts.filter((a) => a.outcome === 'ACCEPTED' && (a.attemptNumber as number) > 1).length;

    const completedJobs = jobs.filter(
      (j) => j.status === 'SUCCESS' && j.completedAt && j.createdAt
    );
    const avgRecoveryMs = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => {
          const ms = new Date(toIso(j.completedAt)).getTime() - new Date(toIso(j.createdAt)).getTime();
          return sum + ms;
        }, 0) / completedJobs.length
      : 0;

    const overview: AnalyticsOverview = {
      recoveryRate:          Math.round(recoveryRate * 1000) / 10,
      totalRecovered,
      totalCancelled,
      revenueRecovered:      Math.round(revenueRecovered * 100) / 100,
      avgCallsPerRecovery:   Math.round(avgCallsPerRecovery * 10) / 10,
      acceptanceRate:        totalCallAttempts > 0 ? Math.round((accepted / totalCallAttempts) * 1000) / 10 : 0,
      callbackRate:          totalCallAttempts > 0 ? Math.round((callbacks / totalCallAttempts) * 1000) / 10 : 0,
      failedRecoveryRate:    totalCancelled > 0 ? Math.round((jobs.filter((j) => j.status === 'FAILED').length / totalCancelled) * 1000) / 10 : 0,
      avgRecoveryTimeMinutes: Math.round(avgRecoveryMs / 60000),
      noAnswerRate:          totalCallAttempts > 0 ? Math.round((noAnswers / totalCallAttempts) * 1000) / 10 : 0,
      retrySuccessRate:      retried > 0 ? Math.round((retriedAccepted / retried) * 1000) / 10 : 0,
      totalActiveJobs,
      totalCallAttempts,
    };

    res.json(overview);
  } catch (err) { next(err); }
});

router.get('/trends', async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days ?? 30), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [jobsSnap, attemptsSnap] = await Promise.all([
      col.recoveryJobs.where('createdAt', '>=', since).get(),
      col.callAttempts.where('initiatedAt', '>=', since).get(),
    ]);

    const byDate: Record<string, AnalyticsTrend> = {};

    const dateKey = (iso: string) => iso.slice(0, 10);
    const ensureDay = (key: string) => {
      if (!byDate[key]) byDate[key] = { date: key, recovered: 0, cancelled: 0, recoveryRate: 0, revenue: 0, attempts: 0 };
    };

    for (const doc of jobsSnap.docs) {
      const d = doc.data();
      const key = dateKey(toIso(d.createdAt));
      ensureDay(key);
      byDate[key].cancelled++;
      if (d.status === 'SUCCESS') {
        byDate[key].recovered++;
        byDate[key].revenue += (d.price as number) ?? 0;
      }
    }

    for (const doc of attemptsSnap.docs) {
      const d = doc.data();
      const key = dateKey(toIso(d.initiatedAt));
      ensureDay(key);
      byDate[key].attempts++;
    }

    const data: AnalyticsTrend[] = Object.values(byDate)
      .map((row) => ({
        ...row,
        revenue: Math.round(row.revenue * 100) / 100,
        recoveryRate: row.cancelled > 0 ? Math.round((row.recovered / row.cancelled) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ data });
  } catch (err) { next(err); }
});

router.get('/outcomes', async (_req, res, next) => {
  try {
    const snap = await col.callAttempts.get();
    const attempts = snap.docs.map((d) => d.data());
    const total = attempts.length;

    const counts: Partial<Record<CallOutcome, number>> = {};
    for (const a of attempts) {
      const o = a.outcome as CallOutcome | undefined;
      if (o) counts[o] = (counts[o] ?? 0) + 1;
    }

    const outcomes: CallOutcome[] = ['ACCEPTED', 'DECLINED', 'NO_ANSWER', 'VOICEMAIL', 'CALLBACK_REQUESTED', 'FAILED'];
    const data: OutcomeDistribution[] = outcomes.map((outcome) => ({
      outcome,
      count: counts[outcome] ?? 0,
      percentage: total > 0 ? Math.round(((counts[outcome] ?? 0) / total) * 1000) / 10 : 0,
    }));

    res.json({ data });
  } catch (err) { next(err); }
});

export default router;
