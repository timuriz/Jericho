import { Router } from 'express';
import { col, now, docJson } from '../lib/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/error';
import {
  CreateAppointmentSchema,
  CancelAppointmentSchema,
  CreateAppointmentTypeSchema,
} from '../schemas';
import { createRecoveryJob } from '../services/createRecoveryJob';
import { createCalcomBooking } from '../services/createCalcomBooking';
import { cancelCalcomBooking } from '../services/cancelCalcomBooking';
import { Appointment, AppointmentType, Location } from '../types';

const APT_TS  = ['startTime', 'endTime', 'createdAt', 'updatedAt', 'cancelledAt', 'recoveredAt'];
const TYPE_TS = ['createdAt'];
const router = Router();

// ── Static meta routes must come before /:id ─────────────────────────────────

router.get('/meta/types', async (_req, res, next) => {
  try {
    const snap = await col.appointmentTypes.orderBy('name').get();
    const data = snap.docs.map((d) => docJson<AppointmentType>(d, TYPE_TS));
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/meta/types', validateBody(CreateAppointmentTypeSchema), async (req, res, next) => {
  try {
    const locationDoc = await col.locations.doc(req.body.locationId).get();
    if (!locationDoc.exists) throw new AppError(404, 'Location not found', 'NOT_FOUND');

    const ref = col.appointmentTypes.doc();
    await ref.set({ ...req.body, createdAt: now() });
    const created = await ref.get();
    res.status(201).json(docJson<AppointmentType>(created, TYPE_TS));
  } catch (err) { next(err); }
});

router.get('/meta/locations', async (_req, res, next) => {
  try {
    const snap = await col.locations.orderBy('name').get();
    const data = snap.docs.map((d) => docJson<Location>(d, []));
    res.json({ data });
  } catch (err) { next(err); }
});

// ── Appointment CRUD ──────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    let query = col.appointments as FirebaseFirestore.Query;
    if (req.query.status)     query = query.where('status', '==', req.query.status);
    if (req.query.locationId) query = query.where('locationId', '==', req.query.locationId);

    const snap = await query.limit(200).get();
    const data = snap.docs
      .map((d) => docJson<Appointment>(d, APT_TS))
      .sort((a, b) => b.startTime.localeCompare(a.startTime));
    res.json({ data, total: data.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await col.appointments.doc(req.params.id).get();
    if (!doc.exists) throw new AppError(404, 'Appointment not found', 'NOT_FOUND');
    res.json(docJson<Appointment>(doc, APT_TS));
  } catch (err) { next(err); }
});

router.post('/', validateBody(CreateAppointmentSchema), async (req, res, next) => {
  try {
    const [customerDoc, typeDoc, locationDoc] = await Promise.all([
      col.customers.doc(req.body.customerId).get(),
      col.appointmentTypes.doc(req.body.appointmentTypeId).get(),
      col.locations.doc(req.body.locationId).get(),
    ]);

    if (!customerDoc.exists) throw new AppError(404, 'Customer not found', 'NOT_FOUND');
    if (!typeDoc.exists)     throw new AppError(404, 'Appointment type not found', 'NOT_FOUND');
    if (!locationDoc.exists) throw new AppError(404, 'Location not found', 'NOT_FOUND');

    const customer  = customerDoc.data()!;
    const type      = typeDoc.data()!;
    const location  = locationDoc.data()!;
    const startTime = Timestamp.fromDate(new Date(req.body.startTime));
    const endTime   = Timestamp.fromDate(new Date(new Date(req.body.startTime).getTime() + type.duration * 60000));

    const ref = col.appointments.doc();
    await ref.set({
      customerId:           customer.id ?? customerDoc.id,
      customerName:         customer.name,
      customerPhone:        customer.phone,
      appointmentTypeId:    type.id ?? typeDoc.id,
      appointmentTypeName:  type.name,
      locationId:           location.id ?? locationDoc.id,
      locationName:         location.name,
      startTime,
      endTime,
      status:               'BOOKED',
      notes:                req.body.notes ?? null,
      price:                type.price,
      wantsEarlierSlot:     req.body.wantsEarlierSlot ?? false,
      createdAt:            now(),
      updatedAt:            now(),
    });

    // Update customer appointment count
    await col.customers.doc(req.body.customerId).update({
      appointmentCount: (customer.appointmentCount ?? 0) + 1,
      lastVisitDate:    startTime,
      updatedAt:        now(),
    });

    // Create matching Cal.com booking — fire-and-forget, don't fail the request if Cal.com is down
    createCalcomBooking({
      customerName: customer.name,
      customerEmail: customer.email ?? null,
      customerPhone: customer.phone,
      startTime: req.body.startTime,
    }).then(async (uid) => {
      console.log(`[appointments/create] Cal.com booking created — uid=${uid} appointmentId=${ref.id}`);
      await ref.update({ calcomBookingUid: uid });
    }).catch((err) => {
      console.error(`[appointments/create] Cal.com booking failed — appointmentId=${ref.id}`, err);
    });

    const created = await ref.get();
    res.status(201).json(docJson<Appointment>(created, APT_TS));
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', validateBody(CancelAppointmentSchema), async (req, res, next) => {
  try {
    const ref = col.appointments.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) throw new AppError(404, 'Appointment not found', 'NOT_FOUND');

    const appt = doc.data()!;
    if (appt.status !== 'BOOKED') {
      throw new AppError(409, `Cannot cancel appointment with status ${appt.status}`, 'INVALID_STATUS');
    }

    await ref.update({
      status:      'CANCELLED',
      cancelledAt: now(),
      cancelledBy: req.body.cancelledBy,
      updatedAt:   now(),
    });

    // Cancel matching Cal.com booking if one exists
    const calcomUid = appt.calcomBookingUid as string | undefined;
    if (calcomUid) {
      cancelCalcomBooking(calcomUid, `Cancelled by ${req.body.cancelledBy}`).catch((err) =>
        console.error(`[appointments/cancel] Cal.com cancel failed — uid=${calcomUid}`, err)
      );
    }

    // Trigger recovery asynchronously — cancel returns immediately
    createRecoveryJob(req.params.id).catch((err) =>
      console.error(`[Recovery] Failed to start recovery for ${req.params.id}:`, err)
    );

    const updated = await ref.get();
    res.json(docJson<Appointment>(updated, APT_TS));
  } catch (err) { next(err); }
});

export default router;
