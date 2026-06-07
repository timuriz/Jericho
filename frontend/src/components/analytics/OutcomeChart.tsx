import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { OutcomeDistribution, AnalyticsTrend } from '@/types';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

const OUTCOME_COLORS: Record<string, string> = {
  ACCEPTED: '#16a34a',
  DECLINED: '#dc2626',
  NO_ANSWER: '#d97706',
  VOICEMAIL: '#9333ea',
  CALLBACK_REQUESTED: '#4f46e5',
  FAILED: '#ef4444',
};

const OUTCOME_LABELS: Record<string, string> = {
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  NO_ANSWER: 'No Answer',
  VOICEMAIL: 'Voicemail',
  CALLBACK_REQUESTED: 'Callback',
  FAILED: 'Failed',
};

interface OutcomeProps {
  data?: OutcomeDistribution[];
  loading: boolean;
}

export function OutcomeChart({ data, loading }: OutcomeProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Call Outcome Distribution</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  const filtered = (data ?? []).filter((d) => d.count > 0);

  return (
    <Card>
      <CardHeader><CardTitle>Call Outcome Distribution</CardTitle></CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            No call data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={filtered}
                dataKey="count"
                nameKey="outcome"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={2}
              >
                {filtered.map((entry) => (
                  <Cell key={entry.outcome} fill={OUTCOME_COLORS[entry.outcome] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(220,13%,91%)', fontSize: 12 }}
                formatter={(v: number, name: string) => [v, OUTCOME_LABELS[name] ?? name]}
              />
              <Legend
                formatter={(value) => OUTCOME_LABELS[value] ?? value}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface RevenueProps {
  data?: AnalyticsTrend[];
  loading: boolean;
}

export function RevenueChart({ data, loading }: RevenueProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Revenue Recovered</CardTitle></CardHeader>
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
      <CardHeader><CardTitle>Revenue Recovered</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(220,13%,91%)', fontSize: 12 }}
              formatter={(v: number) => [formatCurrency(v), 'Revenue']}
            />
            <Bar dataKey="revenue" fill="hsl(0, 72.2%, 50.6%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
