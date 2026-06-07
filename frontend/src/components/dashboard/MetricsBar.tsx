import { TrendingUp, DollarSign, Phone, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import type { AnalyticsOverview } from '@/types';

interface Props {
  data?: AnalyticsOverview;
  loading: boolean;
}

export function MetricsBar({ data, loading }: Props) {
  const metrics = [
    {
      label: 'Recovery Rate',
      value: data ? `${data.recoveryRate}%` : '—',
      sub: data ? `${data.totalRecovered}/${data.totalCancelled} slots` : '',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Revenue Recovered',
      value: data ? formatCurrency(data.revenueRecovered) : '—',
      sub: `${data?.totalRecovered ?? 0} appointments`,
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Acceptance Rate',
      value: data ? `${data.acceptanceRate}%` : '—',
      sub: `Avg ${data?.avgCallsPerRecovery ?? 0} calls/recovery`,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Active Jobs',
      value: data ? String(data.totalActiveJobs) : '—',
      sub: `${data?.totalCallAttempts ?? 0} total calls`,
      icon: Phone,
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((m) => (
        <Card key={m.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <div className={`h-8 w-8 rounded-full ${m.bg} flex items-center justify-center`}>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
