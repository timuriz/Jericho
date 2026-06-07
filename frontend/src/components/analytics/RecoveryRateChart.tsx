import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import type { AnalyticsTrend } from '@/types';

interface Props {
  data?: AnalyticsTrend[];
  loading: boolean;
}

export function RecoveryRateChart({ data, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Recovery Rate Trend</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  const formatted = (data ?? []).map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'MMM d'),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recovery Rate Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="recoveryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72.2%, 50.6%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(0, 72.2%, 50.6%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(220,13%,91%)', fontSize: 12 }}
              formatter={(v: number) => [`${v}%`, 'Recovery Rate']}
            />
            <Area
              type="monotone"
              dataKey="recoveryRate"
              stroke="hsl(0, 72.2%, 50.6%)"
              strokeWidth={2}
              fill="url(#recoveryGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
