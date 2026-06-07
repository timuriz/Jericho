import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MetricsGrid } from '@/components/analytics/MetricsGrid';
import { RecoveryRateChart } from '@/components/analytics/RecoveryRateChart';
import { OutcomeChart, RevenueChart } from '@/components/analytics/OutcomeChart';
import { useAnalyticsOverview, useAnalyticsTrends, useOutcomeDistribution } from '@/hooks/useAnalytics';

const DAY_OPTIONS = [7, 14, 30, 90];

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: trends, isLoading: trendsLoading } = useAnalyticsTrends(days);
  const { data: outcomes, isLoading: outcomesLoading } = useOutcomeDistribution();

  return (
    <div className="space-y-6">
      <MetricsGrid data={overview} loading={overviewLoading} />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Showing last</span>
        {DAY_OPTIONS.map((d) => (
          <Button
            key={d}
            size="sm"
            variant={days === d ? 'default' : 'outline'}
            onClick={() => setDays(d)}
          >
            {d}d
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecoveryRateChart data={trends?.data} loading={trendsLoading} />
        <RevenueChart data={trends?.data} loading={trendsLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OutcomeChart data={outcomes?.data} loading={outcomesLoading} />
      </div>
    </div>
  );
}
