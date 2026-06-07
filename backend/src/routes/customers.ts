import { Router } from 'express';
import { col, now, docJson } from '../lib/firebase';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/error';
import { CreateCustomerSchema, UpdateCustomerSchema } from '../schemas';
import { Customer } from '../types';

const TS = ['createdAt', 'updatedAt', 'lastVisitDate'];
const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const snap = await col.customers.orderBy('name').limit(200).get();
    const data = snap.docs.map((d) => docJson<Customer>(d, TS));
    res.json({ data, total: data.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await col.customers.doc(req.params.id).get();
    if (!doc.exists) throw new AppError(404, 'Customer not found', 'NOT_FOUND');
    res.json(docJson<Customer>(doc, TS));
  } catch (err) { next(err); }
});

router.post('/', validateBody(CreateCustomerSchema), async (req, res, next) => {
  try {
    const locationDoc = await col.locations.doc(req.body.locationId).get();
    if (!locationDoc.exists) throw new AppError(404, 'Location not found', 'NOT_FOUND');

    const ref = col.customers.doc();
    await ref.set({
      ...req.body,
      locationName: locationDoc.data()!.name,
      isActive: true,
      appointmentCount: 0,
      createdAt: now(),
      updatedAt: now(),
    });
    const created = await ref.get();
    res.status(201).json(docJson<Customer>(created, TS));
  } catch (err) { next(err); }
});

router.patch('/:id', validateBody(UpdateCustomerSchema), async (req, res, next) => {
  try {
    const ref = col.customers.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) throw new AppError(404, 'Customer not found', 'NOT_FOUND');

    await ref.update({ ...req.body, updatedAt: now() });
    const updated = await ref.get();
    res.json(docJson<Customer>(updated, TS));
  } catch (err) { next(err); }
});

export default router;
