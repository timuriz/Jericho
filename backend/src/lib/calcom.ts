import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Cal.com API v2 client
export const calcomClient = axios.create({
  baseURL: process.env.CAL_BASE_URL ?? 'https://api.cal.com',
  headers: {
    Authorization: `Bearer ${process.env.CAL_API_KEY}`,
    'cal-api-version': '2024-08-13',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Customers don't always have an email — Cal.com requires one, so we synthesise a
// placeholder that is unique per phone number. It won't receive emails but allows
// the booking to be created and tracked.
export function attendeeEmail(email: string | undefined | null, phone: string): string {
  if (email) return email;
  const digits = phone.replace(/\D/g, '');
  return `${digits}@jericho.patient`;
}
