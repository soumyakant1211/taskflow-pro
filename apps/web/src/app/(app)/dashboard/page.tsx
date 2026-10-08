'use client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FolderKanban, ListTodo, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { EmptyState, PageHeader, PriorityBadge, Spinner, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate, fmtDateTime, isOverdue } from '@/lib/format';
import { DashboardStats, STATUS_LABEL, TASK_PRIORITIES, TASK_STATUSES } from '@/lib/types';

const STATUS_COLOR = { TODO: 'bg-slate-400', IN_PROGRESS: 'bg-blue-500', IN_REVIEW: 'bg-amber-500', DONE: 'bg-emerald-500' };
const PRIORITY_COLOR = { LOW: 'bg-slate-400', MEDIUM: 'bg-sky-500', HIGH: 'bg-orange-500', CRITICAL: 'bg-red-500' };

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({ queryKey: ['dashboard'], queryFn: () => api<DashboardStats>('/dashboard/stats') });

  if (isLoading) return <Spinner />;
  if (isError || !data) return <EmptyState title="Could not load dashboard" />;

  const kpis = [
    { label: 'Projects', value: data.totals.projects, icon: FolderKanban, id: 'projects' },
    { label: 'Total tasks', value: data.totals.tasks, icon: ListTodo, id: 'tasks' },
    { label: 'My open tasks', value: data.totals.myOpenTasks, icon: UserCheck, id: 'my-open' },
    { label: 'Overdue', value: data.totals.overdue, icon: AlertTriangle, id: 'overdue', alert: data.totals.overdue > 0 },
    { label: 'Done this week', value: data.totals.doneThisWeek, icon: CheckCircle2, id: 'done-week' },
  ];
  const maxStatus = Math.max(1, ...Object.values(data.tasksByStatus));
  const maxPriority = Math.max(1, ...Object.values(data.tasksByPriority));

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${user?.name.split(' ')[0]} 👋`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {kpis.map(({ label, value, icon: Icon, id, alert }) => (
          <div key={id} className="card p-4" data-testid={`kpi-${id}`}>
            <div className="flex items-center justify-between text-sm text-slate-500">{label}<Icon size={16} className={alert ? 'text-red-500' : ''} /></div>
            <div className={`mt-2 text-3xl font-semibold ${alert ? 'text-red-600' : ''}`} data-testid={`kpi-${id}-value`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5" data-testid="chart-status">
          <h2 className="mb-4 font-semibold">Tasks by status</h2>
          {TASK_STATUSES.map((s) => (
            <div key={s} className="mb-3">
              <div className="mb-1 flex justify-between text-sm"><span>{STATUS_LABEL[s]}</span><span data-testid={`status-count-${s}`}>{data.tasksByStatus[s]}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${STATUS_COLOR[s]}`} style={{ width: `${(data.tasksByStatus[s] / maxStatus) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="card p-5" data-testid="chart-priority">
          <h2 className="mb-4 font-semibold">Tasks by priority</h2>
          {TASK_PRIORITIES.map((p) => (
            <div key={p} className="mb-3">
              <div className="mb-1 flex justify-between text-sm"><span>{p}</span><span data-testid={`priority-count-${p}`}>{data.tasksByPriority[p]}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${PRIORITY_COLOR[p]}`} style={{ width: `${(data.tasksByPriority[p] / maxPriority) * 100}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="card p-5" data-testid="my-tasks">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">My open tasks</h2>
            <Link href="/tasks?assigneeId=me" className="text-sm text-brand-600">View all</Link>
          </div>
          {data.myTasks.length === 0 ? <p className="text-sm text-slate-500">Nothing assigned to you. 🎉</p> : (
            <ul className="divide-y divide-slate-100">
              {data.myTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2" data-testid="my-task-row">
                  <Link href={`/tasks/${t.id}`} className="min-w-0 truncate text-sm hover:text-brand-600"><span className="font-mono text-slate-400">{t.key}</span> {t.title}</Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-xs ${isOverdue(t.dueDate, t.status) ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{fmtDate(t.dueDate)}</span>
                    <PriorityBadge priority={t.priority} /><StatusBadge status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5" data-testid="recent-activity">
          <h2 className="mb-4 font-semibold">Recent activity</h2>
          {data.recentActivity.length === 0 ? <p className="text-sm text-slate-500">No activity yet.</p> : (
            <ul className="space-y-3">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="text-sm" data-testid="activity-item">
                  <p>{a.message}</p>
                  <p className="text-xs text-slate-400">{fmtDateTime(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
