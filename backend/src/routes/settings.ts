import { Router } from 'express';
import { col, now } from '../lib/firebase';
import { validateBody } from '../middleware/validate';
import { UpdateSettingsSchema } from '../schemas';
import { Settings } from '../types';

const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'updatedAt'> = {
  aiSystemPrompt: 'You are a friendly dental clinic assistant calling to offer a newly available appointment slot. Be warm, concise, and professional.',
  maxRetries: 2,
  callbackDelayMinutes: 30,
  voiceSettings: {
    voiceId: 'default',
    language: 'en-US',
    speakingStyle: 'friendly',
    tone: 'professional',
  },
};

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const doc = await col.settings.doc('default').get();
    if (!doc.exists) {
      return res.json({ id: 'default', ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() });
    }
    const data = doc.data()!;
    res.json({ id: 'default', ...data, updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString() });
  } catch (err) { next(err); }
});

router.put('/', validateBody(UpdateSettingsSchema), async (req, res, next) => {
  try {
    const ref = col.settings.doc('default');
    await ref.set({ ...req.body, updatedAt: now() }, { merge: true });
    const updated = await ref.get();
    const data = updated.data()!;
    res.json({ id: 'default', ...data, updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString() });
  } catch (err) { next(err); }
});

export default router;
