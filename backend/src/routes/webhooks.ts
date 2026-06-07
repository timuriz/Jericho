import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import { FonioWebhookSchema, CalcomWebhookSchema } from '../schemas';
import { processOutcome } from '../services/processOutcome';
import { createRecoveryJob } from '../services/createRecoveryJob';
import { col, now, docJson } from '../lib/firebase';
import { Appointment } from '../types';

const APT_TS = ['startTime', 'endTime', 'createdAt', 'updatedAt', 'cancelledAt', 'recoveredAt'];
const router = Router();
const ts = () => new Date().toISOString().slice(11, 23);

// ── Fonio ─────────────────────────────────────────────────────────────────────

router.post('/fonio', validateBody(FonioWebhookSchema), async (req, res, next) => {
  try {
    const body = req.body;
    console.log(`\n${ts()} [webhook/fonio] >>> INCOMING — id=${body.id} toNumber=${body.toNumber ?? 'null'} duration=${body.duration ?? '?'}s disconnectReason=${body.disconnectReason ?? 'none'}`);
    console.log(`${ts()} [webhook/fonio] extractionData=${JSON.stringify(body.extractionData)}`);

    if (!body.extractionData?.callOutcome) {
      console.log(`${ts()} [webhook/fonio] No callOutcome in payload — ignoring (in-progress event)`);
      return res.json({ ok: true });
    }

    console.log(`${ts()} [webhook/fonio] Dispatching to processOutcome — outcome=${body.extractionData.callOutcome}`);
    await processOutcome(body);
    console.log(`${ts()} [webhook/fonio] processOutcome complete`);
    res.json({ ok: true });
  } catch (err) {
    console.error(`${ts()} [webhook/fonio] Unhandled error:`, err);
    next(err);
  }
});

// ── Cal.com ───────────────────────────────────────────────────────────────────

router.post('/calcom', validateBody(CalcomWebhookSchema), async (req, res, next) => {
  try {
    const { triggerEvent, payload } = req.body;
    console.log(`\n${ts()} [webhook/calcom] >>> INCOMING — triggerEvent=${triggerEvent} bookingUid=${payload.uid} startTime=${payload.startTime ?? 'n/a'}`);

    if (triggerEvent === 'BOOKING_CREATED' || triggerEvent === 'BOOKING_RESCHEDULED') {
      // Primary duplicate check: exact calcomBookingUid match
      const existing = await col.appointments.where('calcomBookingUid', '==', payload.uid).get();
      if (!existing.empty) {
        console.log(`[webhook/calcom] ${triggerEvent} — appointment already exists in Jericho (uid=${payload.uid}), skipping`);
        return res.json({ ok: true });
      }

      const attendee = payload.attendees?.[0];
      if (!attendee || !payload.startTime || !payload.endTime) {
        console.warn(`[webhook/calcom] ${triggerEvent} — missing attendee or time data, skipping`);
        return res.json({ ok: true });
      }

      // Find or match a customer by phone or email
      const phone = attendee.phoneNumber ?? null;
      const email = attendee.email as string;
      // Synthetic email: digits@jericho.patient — extract phone from it when no direct phone
      const syntheticMatch = email?.match(/^(\d+)@jericho\.patient$/);
      const derivedPhone = syntheticMatch ? `+${syntheticMatch[1]}` : null;
      const lookupPhone = phone ?? derivedPhone;

      let customerSnap = lookupPhone
        ? await col.customers.where('phone', '==', lookupPhone).limit(1).get()
        : null;
      if (!customerSnap || customerSnap.empty) {
        customerSnap = await col.customers.where('email', '==', email).limit(1).get();
      }

      if (!customerSnap || customerSnap.empty) {
        console.warn(`[webhook/calcom] ${triggerEvent} — no matching customer found for attendee ${attendee.name} (${email}), skipping`);
        return res.json({ ok: true });
      }

      const customerDoc = customerSnap.docs[0];
      const customer = customerDoc.data();

      // Secondary duplicate check: an appointment for this customer at this start time
      // already exists in Jericho (handles race condition where BOOKING_CREATED arrives
      // before processOutcome has written calcomBookingUid to the appointment).
      const activeSnap = await col.appointments
        .where('customerId', '==', customerDoc.id)
        .where('status', 'in', ['BOOKED', 'RECOVERED'])
        .get();
      const payloadStart = payload.startTime as string;
      // Normalise both to UTC before comparing — Cal.com may return the time in the
      // attendee's local timezone (e.g. '+02:00') while Firestore stores UTC.
      const payloadUtcMinute = new Date(payloadStart).toISOString().slice(0, 16);
      const sameSlot = activeSnap.docs.find((d) => {
        const st = d.data().startTime;
        const stIso: string = st?.toDate ? st.toDate().toISOString() : String(st ?? '');
        return new Date(stIso).toISOString().slice(0, 16) === payloadUtcMinute;
      });
      if (sameSlot) {
        console.log(`[webhook/calcom] ${triggerEvent} — appointment ${sameSlot.id} already exists for customer ${customer.name} at this slot, backfilling calcomBookingUid=${payload.uid}`);
        if (!sameSlot.data().calcomBookingUid) {
          await sameSlot.ref.update({ calcomBookingUid: payload.uid });
        }
        return res.json({ ok: true });
      }

      // Find appointment type by Cal.com eventTypeId match or fallback to first available
      const typesSnap = await col.appointmentTypes.limit(1).get();
      if (typesSnap.empty) {
        console.warn(`[webhook/calcom] No appointment types configured, skipping`);
        return res.json({ ok: true });
      }
      const typeDoc = typesSnap.docs[0];
      const type = typeDoc.data();

      const locSnap = await col.locations.limit(1).get();
      const locationDoc = locSnap.docs[0];
      const location = locationDoc.data();

      const ref = col.appointments.doc();
      await ref.set({
        customerId:        customerDoc.id,
        customerName:      customer.name,
        customerPhone:     customer.phone,
        appointmentTypeId: typeDoc.id,
        appointmentTypeName: type.name,
        locationId:        locationDoc.id,
        locationName:      location.name,
        startTime:         payload.startTime,
        endTime:           payload.endTime,
        status:            'BOOKED',
        notes:             null,
        price:             type.price ?? 0,
        wantsEarlierSlot:  false,
        calcomBookingUid:  payload.uid,
        createdAt:         now(),
        updatedAt:         now(),
      });
      console.log(`[webhook/calcom] ${triggerEvent} — created Jericho appointment ${ref.id} for ${customer.name} (calcomUid=${payload.uid})`);
    }

    else if (triggerEvent === 'BOOKING_CANCELLED') {
      const snap = await col.appointments.where('calcomBookingUid', '==', payload.uid).limit(1).get();

      if (snap.empty) {
        console.warn(`[webhook/calcom] BOOKING_CANCELLED — no Jericho appointment found for uid=${payload.uid}, ignoring`);
        return res.json({ ok: true });
      }

      const apptDoc = snap.docs[0];
      const appt = docJson<Appointment>(apptDoc, APT_TS);

      if (appt.status !== 'BOOKED') {
        // Already cancelled or recovered on our side — prevent loop
        console.log(`[webhook/calcom] BOOKING_CANCELLED — appointment ${apptDoc.id} already has status=${appt.status}, ignoring`);
        return res.json({ ok: true });
      }

      await apptDoc.ref.update({
        status:      'CANCELLED',
        cancelledAt: now(),
        cancelledBy: 'calcom',
        updatedAt:   now(),
      });
      console.log(`[webhook/calcom] BOOKING_CANCELLED — appointment ${apptDoc.id} cancelled, triggering recovery`);

      createRecoveryJob(apptDoc.id).catch((err) =>
        console.error(`[webhook/calcom] Recovery job failed for ${apptDoc.id}:`, err)
      );
    }

    else {
      console.log(`[webhook/calcom] Unhandled triggerEvent=${triggerEvent}, ignoring`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(`[webhook/calcom] Unhandled error:`, err);
    next(err);
  }
});

export default router;
