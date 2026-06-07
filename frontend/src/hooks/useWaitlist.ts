import { useQuery } from '@tanstack/react-query';
import { waitlistApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export function useWaitlist(params?: { locationId?: string; appointmentTypeId?: string }) {
  return useQuery({
    queryKey: queryKeys.waitlist.filtered(params ?? {}),
    queryFn: () => waitlistApi.list(params),
  });
}
