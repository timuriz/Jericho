import { calcomClient } from '../lib/calcom';

// Cancels a Cal.com booking by its UID.
// Called when a Jericho appointment is cancelled or when a patient upgrades to an earlier slot.
export async function cancelCalcomBooking(bookingUid: string, reason = 'Cancelled via Jericho'): Promise<void> {
  console.log(`[cancelCalcomBooking] START — uid=${bookingUid} reason="${reason}"`);

  try {
    const res = await calcomClient.post(`/v2/bookings/${bookingUid}/cancel`, { cancellationReason: reason });
    console.log(`[cancelCalcomBooking] Done — uid=${bookingUid} status=${res.data?.data?.status ?? res.status}`);
  } catch (err: unknown) {
    const detail = (err as { response?: { data?: unknown } })?.response?.data;
    console.error(`[cancelCalcomBooking] FAILED — uid=${bookingUid}`, detail ?? err);
    throw err;
  }
}
