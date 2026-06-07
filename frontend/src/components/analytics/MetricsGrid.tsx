import { TrendingUp, DollarSign, Phone, CheckCircle, XCircle, Clock, RotateCcw, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import type { AnalyticsOverview } from '@/types';

interface Props {
  data?: AnalyticsOverview;
  loading: boolean;
}

export function MetricsGrid({ data, loading }: Props) {
  const metrics = [
    { label: 'Recovery Rate', value: data ? `${data.recoveryRate}%` : '—', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Revenue Recovered', value: data ? formatCurrency(data.revenueRecovered) : '—', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Acceptance Rate', value: data ? `${data.acceptanceRate}%` : '—', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Failed Recovery', value: data ? `${data.failedRecoveryRate}%` : '—', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Avg Calls/Recovery', value: data ? data.avgCallsPerRecovery.toString() : '—', icon: Phone, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Avg Recovery Time', value: data ? `${data.avgRecoveryTimeMinutes}m` : '—', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'No-Answer Rate', value: data ? `${data.noAnswerRate}%` : '—', icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Retry Success Rate', value: data ? `${data.retrySuccessRate}%` : '—', icon: Percent, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {metrics.map((m) => (
        <Card key={m.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <div className={`h-7 w-7 rounded-full ${m.bg} flex items-center justify-center`}>
                <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold">{m.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
