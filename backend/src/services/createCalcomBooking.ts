import { calcomClient, attendeeEmail } from '../lib/calcom';

export interface CalcomBookingParams {
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  startTime: string; // ISO string
}

// Creates a booking in Cal.com and returns the booking UID.
// The UID is stored on the Jericho appointment so we can cancel it later.
export async function createCalcomBooking(params: CalcomBookingParams): Promise<string> {
  const eventTypeId = Number(process.env.CAL_EVENT_TYPE_ID);
  const timeZone = process.env.CAL_TIMEZONE ?? 'Europe/Vienna';
  const email = attendeeEmail(params.customerEmail, params.customerPhone);

  console.log(`[createCalcomBooking] START — customer=${params.customerName} email=${email} start=${params.startTime} eventTypeId=${eventTypeId}`);

  const payload = {
    eventTypeId,
    start: params.startTime,
    attendee: {
      name: params.customerName,
      email,
      timeZone,
    },
  };

  try {
    const res = await calcomClient.post('/v2/bookings', payload);
    const uid: string = res.data?.data?.uid ?? res.data?.uid;
    console.log(`[createCalcomBooking] Created — uid=${uid} status=${res.data?.data?.status ?? res.data?.status}`);
    return uid;
  } catch (err: unknown) {
    const detail = (err as { response?: { data?: unknown } })?.response?.data;
    console.error(`[createCalcomBooking] FAILED — customer=${params.customerName}`, detail ?? err);
    throw err;
  }
}
