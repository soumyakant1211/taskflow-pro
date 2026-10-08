'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar, Badge, EmptyState, PageHeader, Pagination, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import { Paginated, Role, User } from '@/lib/types';

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'MEMBER'];

export default function UsersAdminPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, role, page }],
    queryFn: () => api<Paginated<User>>('/users', { query: { search, role, page, limit: 10 } }),
    enabled: me?.role === 'ADMIN',
  });
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api<User>(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
    onSuccess: (u) => { toast.success(`${u.name} is now ${u.role}`); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const changeStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api<User>(`/users/${id}/status`, { method: 'PATCH', body: { isActive } }),
    onSuccess: (u) => { toast.success(`${u.name} ${u.isActive ? 'activated' : 'deactivated'}`); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (me?.role !== 'ADMIN') return <EmptyState title="Access denied" hint="Only administrators can manage users." />;

  return (
    <>
      <PageHeader title="Users" subtitle="Manage roles and access" />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input className="input pl-9" placeholder="Search name or email…" data-testid="user-search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-40" aria-label="Role filter" data-testid="user-role-filter" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>{ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      {isLoading ? <Spinner /> : !data?.data.length ? <EmptyState title="No users found" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="user-table">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.data.map((u) => (
                <tr key={u.id} data-testid="user-row" data-email={u.email}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.name} size="md" /><div><p className="font-medium" data-testid="user-name">{u.name}</p><p className="text-xs text-slate-500" data-testid="user-email">{u.email}</p></div></div></td>
                  <td className="px-4 py-3">
                    <select className="input w-32 py-1" aria-label={`Role for ${u.email}`} data-testid="user-role-select" value={u.role} disabled={u.id === me.id}
                      onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value as Role })}>
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><Badge tone={u.isActive ? 'green' : 'red'} testId="user-status">{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== me.id && (
                      <button className={u.isActive ? 'btn-secondary text-red-600' : 'btn-secondary'} data-testid="user-toggle-status"
                        onClick={() => changeStatus.mutate({ id: u.id, isActive: !u.isActive })}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.meta.total > 0 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />}
    </>
  );
}
