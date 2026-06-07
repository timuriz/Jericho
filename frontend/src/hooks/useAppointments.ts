import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/components/ui/use-toast';

export function useAppointments(params?: { status?: string; locationId?: string }) {
  return useQuery({
    queryKey: queryKeys.appointments.filtered(params ?? {}),
    queryFn: () => appointmentsApi.list(params),
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id),
    queryFn: () => appointmentsApi.get(id),
    enabled: !!id,
  });
}

export function useAppointmentTypes() {
  return useQuery({
    queryKey: queryKeys.appointments.types,
    queryFn: () => appointmentsApi.listTypes(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAppointmentLocations() {
  return useQuery({
    queryKey: queryKeys.appointments.locations,
    queryFn: () => appointmentsApi.listLocations(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAppointmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: appointmentsApi.createType,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.types });
      toast({ title: 'Appointment type created' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create type', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: appointmentsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      toast({ title: 'Appointment created', variant: 'default' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create appointment', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cancelledBy }: { id: string; cancelledBy: string }) =>
      appointmentsApi.cancel(id, cancelledBy),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(data.id) });
      qc.invalidateQueries({ queryKey: queryKeys.recoveryJobs.all });
      toast({ title: 'Appointment cancelled', description: 'Recovery process started automatically.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to cancel appointment', description: err.message, variant: 'destructive' });
    },
  });
}
