import { WaitlistTable } from '@/components/waitlist/WaitlistTable';
import { useWaitlist } from '@/hooks/useWaitlist';

export default function Waitlist() {
  const { data, isLoading } = useWaitlist();
  const entries = data?.data ?? [];

  return (
    <div className="space-y-4">
      <WaitlistTable entries={entries} loading={isLoading} />
    </div>
  );
}
