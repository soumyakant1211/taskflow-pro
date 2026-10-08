'use client';
import clsx from 'clsx';
import Link from 'next/link';
import { fmtDate, isOverdue } from '@/lib/format';
import { Task } from '@/lib/types';
import { EmptyState, PriorityBadge, StatusBadge } from './ui';

export function TaskTable({ tasks, showProject = false }: { tasks: Task[]; showProject?: boolean }) {
  if (!tasks.length) return <EmptyState title="No tasks found" />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm" data-testid="task-table">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Key</th><th className="px-4 py-3">Title</th>{showProject && <th className="px-4 py-3">Project</th>}<th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Due</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((t) => (
            <tr key={t.id} data-testid="task-row" className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs text-slate-500" data-testid="task-row-key">{t.key}</td>
              <td className="px-4 py-3"><Link href={`/tasks/${t.id}`} className="font-medium hover:text-brand-600" data-testid="task-row-title">{t.title}</Link></td>
              {showProject && <td className="px-4 py-3 text-slate-500" data-testid="task-row-project">{t.project.name}</td>}
              <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
              <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
              <td className="px-4 py-3" data-testid="task-row-assignee">{t.assignee?.name ?? <span className="text-slate-400">Unassigned</span>}</td>
              <td className={clsx('px-4 py-3', isOverdue(t.dueDate, t.status) && 'font-semibold text-red-600')} data-testid="task-row-due">{fmtDate(t.dueDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

