import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: queryKeys.analytics.overview,
    queryFn: analyticsApi.overview,
    refetchInterval: 30 * 1000,
  });
}

export function useAnalyticsTrends(days = 30) {
  return useQuery({
    queryKey: queryKeys.analytics.trends(days),
    queryFn: () => analyticsApi.trends(days),
    staleTime: 60 * 1000,
  });
}

export function useOutcomeDistribution() {
  return useQuery({
    queryKey: queryKeys.analytics.outcomes,
    queryFn: analyticsApi.outcomes,
    staleTime: 60 * 1000,
  });
}
