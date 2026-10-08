'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, EmptyState, PageHeader, Pagination, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDateTime } from '@/lib/format';
import { Activity, Paginated } from '@/lib/types';

export default function ActivityPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['activity', page],
    queryFn: () => api<Paginated<Activity>>('/activity', { query: { page, limit: 20 } }),
    enabled: user?.role === 'ADMIN',
  });
  if (user?.role !== 'ADMIN') return <EmptyState title="Access denied" hint="Only administrators can view the audit log." />;

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every create, update and delete across the platform" />
      {isLoading ? <Spinner /> : !data?.data.length ? <EmptyState title="No activity yet" /> : (
        <div className="card divide-y divide-slate-100" data-testid="activity-list">
          {data.data.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm" data-testid="activity-row">
              <div className="flex items-center gap-3"><Badge tone="indigo">{a.action}</Badge><span data-testid="activity-message">{a.message}</span></div>
              <span className="text-xs text-slate-400">{fmtDateTime(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
      {data && data.meta.total > 0 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />}
    </>
  );
}
