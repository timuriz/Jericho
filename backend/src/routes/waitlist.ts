import { Router } from 'express';
import { col, toIso } from '../lib/firebase';
import { WaitlistEntry } from '../types';

const router = Router();

// The waitlist is derived from all BOOKED appointments.
// Any customer with a future booking is implicitly on the waitlist —
// they'll be offered an earlier slot if one opens for the same type + location.
router.get('/', async (req, res, next) => {
  try {
    let query = col.appointments
      .where('status', '==', 'BOOKED')
      .where('wantsEarlierSlot', '==', true) as FirebaseFirestore.Query;

    if (req.query.locationId)        query = query.where('locationId', '==', req.query.locationId);
    if (req.query.appointmentTypeId) query = query.where('appointmentTypeId', '==', req.query.appointmentTypeId);

    const snap = await query.limit(200).get();

    const data: WaitlistEntry[] = snap.docs.map((d) => {
      const a = d.data();
      return {
        id: d.id,
        customerId: a.customerId,
        customerName: a.customerName,
        customerPhone: a.customerPhone,
        appointmentTypeId: a.appointmentTypeId,
        appointmentTypeName: a.appointmentTypeName,
        locationId: a.locationId,
        locationName: a.locationName,
        preferredTimeOfDay: 'ANY',
        manualPriorityBoost: 0,
        status: 'ACTIVE',
        consentGiven: true,
        joinedAt: toIso(a.startTime),
        updatedAt: toIso(a.updatedAt),
        notes: a.notes ?? undefined,
      };
    });

    data.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

    res.json({ data, total: data.length });
  } catch (err) { next(err); }
});

export default router;
