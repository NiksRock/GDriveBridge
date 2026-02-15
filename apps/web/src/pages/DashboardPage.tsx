import { useQuery } from '@tanstack/react-query';
import { listTransfers } from '../api/transfers';
import { Link } from 'react-router-dom';
import type { TransferSummary } from '@gdrivebridge/shared';

export function DashboardPage() {
  const { data, isLoading } = useQuery<TransferSummary[]>({
    queryKey: ['transfers'],
    queryFn: listTransfers,
  });

  if (isLoading) return <div>Loading...</div>;

  if (!data || data.length === 0) {
    return <div>No transfers found</div>;
  }

  return (
    <div>
      <h1>Transfers</h1>

      {data.map((t) => (
        <div key={t.id}>
          <Link to={`/transfers/${t.id}`}>
            {t.mode} — {t.status}
          </Link>
        </div>
      ))}
    </div>
  );
}
