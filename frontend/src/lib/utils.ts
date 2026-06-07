import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import type { RecoveryJobStatus, CandidateStatus, CallOutcome, AppointmentStatus } from '../types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const date = parseISO(dateStr);
  if (!isValid(date)) return '—';
  return format(date, 'MMM d, yyyy');
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const date = parseISO(dateStr);
  if (!isValid(date)) return '—';
  return format(date, 'MMM d, yyyy h:mm a');
}

export function formatTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const date = parseISO(dateStr);
  if (!isValid(date)) return '—';
  return format(date, 'h:mm a');
}

export function formatRelative(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const date = parseISO(dateStr);
  if (!isValid(date)) return '—';
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

export function getJobStatusColor(status: RecoveryJobStatus): string {
  switch (status) {
    case 'SUCCESS': return 'text-green-700 bg-green-50 border-green-200';
    case 'IN_PROGRESS': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'PENDING': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'FAILED': return 'text-red-700 bg-red-50 border-red-200';
    case 'ESCALATED': return 'text-orange-700 bg-orange-50 border-orange-200';
    default: return 'text-gray-700 bg-gray-50 border-gray-200';
  }
}

export function getCandidateStatusColor(status: CandidateStatus): string {
  switch (status) {
    case 'ACCEPTED': return 'text-green-700 bg-green-50 border-green-200';
    case 'CONTACTED': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'PENDING': return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'DECLINED': return 'text-red-700 bg-red-50 border-red-200';
    case 'NO_ANSWER': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'VOICEMAIL': return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'CALLBACK_REQUESTED': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    case 'EXHAUSTED': return 'text-gray-500 bg-gray-50 border-gray-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getOutcomeColor(outcome: CallOutcome): string {
  switch (outcome) {
    case 'ACCEPTED': return 'text-green-700 bg-green-50 border-green-200';
    case 'DECLINED': return 'text-red-700 bg-red-50 border-red-200';
    case 'NO_ANSWER': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'VOICEMAIL': return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'CALLBACK_REQUESTED': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    case 'FAILED': return 'text-red-700 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getAppointmentStatusColor(status: AppointmentStatus): string {
  switch (status) {
    case 'BOOKED': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'CANCELLED': return 'text-red-700 bg-red-50 border-red-200';
    case 'RECOVERED': return 'text-green-700 bg-green-50 border-green-200';
    case 'COMPLETED': return 'text-gray-600 bg-gray-50 border-gray-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getJobStatusLabel(status: RecoveryJobStatus): string {
  switch (status) {
    case 'IN_PROGRESS': return 'In Progress';
    default: return status.charAt(0) + status.slice(1).toLowerCase();
  }
}

export function getOutcomeLabel(outcome: CallOutcome): string {
  switch (outcome) {
    case 'NO_ANSWER': return 'No Answer';
    case 'CALLBACK_REQUESTED': return 'Callback';
    default: return outcome.charAt(0) + outcome.slice(1).toLowerCase();
  }
}

export function getCandidateStatusLabel(status: CandidateStatus): string {
  switch (status) {
    case 'NO_ANSWER': return 'No Answer';
    case 'CALLBACK_REQUESTED': return 'Callback';
    default: return status.charAt(0) + status.slice(1).toLowerCase();
  }
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function getInitials(name: string | undefined | null): string {
  if (!name?.trim()) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '—';
  return phone.replace(/(\+\d{1,3})(\d{3})(\d{3,4})(\d{4})/, '$1 $2 $3 $4');
}
