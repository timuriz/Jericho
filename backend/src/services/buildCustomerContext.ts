import { col, toIso } from '../lib/firebase';
import { CustomerContext, CallOutcome } from '../types';

function ts() { return new Date().toISOString().slice(11, 23); }

// Assembles the context object sent to Fonio before each call.
export async function buildCustomerContext(customerId: string): Promise<CustomerContext> {
  console.log(`${ts()} [buildCustomerContext] Loading context for customerId=${customerId}`);

  const [customerDoc, appointmentsSnap, historySnap] = await Promise.all([
    col.customers.doc(customerId).get(),
    col.appointments
      .where('customerId', '==', customerId)
      .orderBy('startTime', 'desc')
      .limit(5)
      .get(),
    col.contactHistory
      .where('customerId', '==', customerId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get(),
  ]);

  const customer = customerDoc.data() ?? {};
  const lastAppt = appointmentsSnap.docs[0]?.data();
  const lastHistory = historySnap.docs[0]?.data();

  const ctx: CustomerContext = {
    name: customer.name ?? '',
    lastVisit: lastAppt ? lastAppt.startTime : null,
    appointmentCount: customer.appointmentCount ?? 0,
    preferredTime: customer.preferredTimeOfDay ?? 'ANY',
    lastRecoveryOutcome: (lastHistory?.outcome as CallOutcome) ?? null,
  };

  console.log(`${ts()} [buildCustomerContext] name="${ctx.name}" appointmentCount=${ctx.appointmentCount} preferredTime=${ctx.preferredTime} lastRecoveryOutcome=${ctx.lastRecoveryOutcome ?? 'none'} appointments loaded=${appointmentsSnap.size} history loaded=${historySnap.size}`);
  return ctx;
}
