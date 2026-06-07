import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/components/ui/use-toast';

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: settingsApi.get,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings });
      toast({ title: 'Settings saved', variant: 'default' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to save settings', description: err.message, variant: 'destructive' });
    },
  });
}
