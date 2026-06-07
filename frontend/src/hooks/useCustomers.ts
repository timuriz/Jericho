import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/components/ui/use-toast';

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: customersApi.list,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast({ title: 'Customer created' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create customer', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof customersApi.update>[1] }) =>
      customersApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.all });
      qc.invalidateQueries({ queryKey: queryKeys.customers.detail(id) });
      toast({ title: 'Customer updated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update customer', description: err.message, variant: 'destructive' });
    },
  });
}
