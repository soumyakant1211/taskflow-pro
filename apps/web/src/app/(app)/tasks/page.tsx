'use client';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { TaskFormModal } from '@/components/TaskFormModal';
import { TaskTable } from '@/components/TaskTable';
import { PageHeader, Pagination, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Paginated, ProjectSummary, STATUS_LABEL, Task, TASK_PRIORITIES, TASK_STATUSES } from '@/lib/types';

const FILTERS = ['search', 'projectId', 'status', 'priority', 'assigneeId', 'overdue', 'sortBy', 'sortOrder', 'page'] as const;

function TasksView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const { isGuest } = useAuth();
  // Filters live in the URL, so they survive reloads and can be deep-linked (and tested via URL).
  const f = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? ''])) as Record<(typeof FILTERS)[number], string>;
  const page = Number(f.page || 1);

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    router.replace(`${pathname}?${next.toString()}`);
  };

  const projectsQ = useQuery({ queryKey: ['projects', 'picker-all'], queryFn: () => api<Paginated<ProjectSummary>>('/projects', { query: { limit: 100 } }) });
  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'list', f],
    queryFn: () => api<Paginated<Task>>('/tasks', { query: { ...f, page, limit: 10 } }),
  });

  return (
    <>
      <PageHeader title="Tasks" subtitle="Search and filter tasks across your projects"
        actions={!isGuest && <button className="btn-primary" onClick={() => setOpen(true)} data-testid="new-task-button"><Plus size={16} /> New task</button>} />
      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-4 lg:grid-cols-7" data-testid="task-filters">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input className="input pl-9" placeholder="Search title, description or key…" data-testid="task-search" defaultValue={f.search}
            onKeyDown={(e) => e.key === 'Enter' && setFilter('search', (e.target as HTMLInputElement).value)}
            onBlur={(e) => e.target.value !== f.search && setFilter('search', e.target.value)} />
        </div>
        <select className="input" aria-label="Project" data-testid="filter-project" value={f.projectId} onChange={(e) => setFilter('projectId', e.target.value)}>
          <option value="">All projects</option>
          {projectsQ.data?.data.map((p) => <option key={p.id} value={p.id}>{p.key}</option>)}
        </select>
        <select className="input" aria-label="Status" data-testid="filter-status" value={f.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className="input" aria-label="Priority" data-testid="filter-priority" value={f.priority} onChange={(e) => setFilter('priority', e.target.value)}>
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input" aria-label="Sort" data-testid="sort-by" value={`${f.sortBy || 'createdAt'}:${f.sortOrder || 'desc'}`}
          onChange={(e) => { const [by, order] = e.target.value.split(':'); const n = new URLSearchParams(params.toString()); n.set('sortBy', by); n.set('sortOrder', order); n.delete('page'); router.replace(`${pathname}?${n}`); }}>
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="dueDate:asc">Due date ↑</option>
          <option value="priority:desc">Priority ↓</option>
        </select>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" data-testid="filter-mine" checked={f.assigneeId === 'me'} onChange={(e) => setFilter('assigneeId', e.target.checked ? 'me' : '')} /> Mine</label>
          <label className="flex items-center gap-2"><input type="checkbox" data-testid="filter-overdue" checked={f.overdue === 'true'} onChange={(e) => setFilter('overdue', e.target.checked ? 'true' : '')} /> Overdue</label>
        </div>
      </div>
      {isLoading ? <Spinner /> : (
        <>
          <TaskTable tasks={data?.data ?? []} showProject />
          {data && data.meta.total > 0 && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={(p) => setFilter('page', String(p))} />}
        </>
      )}
      <TaskFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default function TasksPage() {
  return <Suspense fallback={<Spinner />}><TasksView /></Suspense>;
}
