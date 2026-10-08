'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DragEvent, FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { TaskFormModal } from '@/components/TaskFormModal';
import { TaskTable } from '@/components/TaskTable';
import { Avatar, Badge, ConfirmDialog, EmptyState, FormError, PageHeader, PriorityBadge, Spinner, StatusBadge } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate, isOverdue } from '@/lib/format';
import { Paginated, ProjectDetail, STATUS_LABEL, Task, TASK_STATUSES, TaskStatus, User } from '@/lib/types';

type Tab = 'board' | 'list' | 'members' | 'settings';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { isGuest } = useAuth();
  const [tab, setTab] = useState<Tab>('board');
  const [createOpen, setCreateOpen] = useState<TaskStatus | null>(null);

  const projectQ = useQuery({ queryKey: ['project', id], queryFn: () => api<ProjectDetail>(`/projects/${id}`) });
  const tasksQ = useQuery({
    queryKey: ['tasks', 'project', id],
    queryFn: () => api<Paginated<Task>>('/tasks', { query: { projectId: id, limit: 100, sortBy: 'priority' } }),
    enabled: projectQ.isSuccess,
  });

  if (projectQ.isLoading) return <Spinner />;
  if (projectQ.isError || !projectQ.data) {
    return <EmptyState title="Project not available" hint={errorMessage(projectQ.error)} action={<Link className="btn-secondary" href="/projects">Back to projects</Link>} />;
  }
  const p = projectQ.data;
  const archived = p.status === 'ARCHIVED';
  const readOnly = archived || isGuest;
  const tabs: Tab[] = p.canManage ? ['board', 'list', 'members', 'settings'] : ['board', 'list', 'members'];

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={<span className="flex items-center gap-2"><span className="font-mono" data-testid="project-key">{p.key}</span>·<Badge tone={archived ? 'slate' : 'green'} testId="project-status">{p.status}</Badge>· Owner: {p.owner.name}</span>}
        actions={!readOnly && <button className="btn-primary" data-testid="new-task-button" onClick={() => setCreateOpen('TODO')}><Plus size={16} /> New task</button>}
      />
      {p.description && <p className="-mt-3 mb-6 text-sm text-slate-600" data-testid="project-description">{p.description}</p>}

      <div className="mb-6 flex gap-1 border-b border-slate-200" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} data-testid={`tab-${t}`} onClick={() => setTab(t)}
            className={clsx('-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize', tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'board' && (tasksQ.isLoading ? <Spinner /> : <Board projectId={id} tasks={tasksQ.data?.data ?? []} onAdd={readOnly ? undefined : setCreateOpen} canMove={!isGuest} />)}
      {tab === 'list' && (tasksQ.isLoading ? <Spinner /> : <TaskTable tasks={tasksQ.data?.data ?? []} />)}
      {tab === 'members' && <Members project={p} />}
      {tab === 'settings' && p.canManage && <Settings project={p} />}

      <TaskFormModal open={!!createOpen} onClose={() => setCreateOpen(null)} projectId={id} members={p.members} defaultStatus={createOpen ?? 'TODO'} />
    </>
  );
}

function Board({ projectId, tasks, onAdd, canMove }: { projectId: string; tasks: Task[]; onAdd?: (s: TaskStatus) => void; canMove: boolean }) {
  const qc = useQueryClient();
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const key = ['tasks', 'project', projectId];

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => api<Task>(`/tasks/${id}/status`, { method: 'PATCH', body: { status } }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Paginated<Task>>(key);
      qc.setQueryData<Paginated<Task>>(key, (old) => old && { ...old, data: old.data.map((t) => (t.id === id ? { ...t, status } : t)) });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      toast.error(errorMessage(e));
    },
    onSuccess: (t) => toast.success(`${t.key} moved to ${STATUS_LABEL[t.status]}`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const onDrop = (status: TaskStatus) => (e: DragEvent) => {
    e.preventDefault();
    if (!canMove) return;
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== status) move.mutate({ id, status });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="kanban-board">
      {TASK_STATUSES.map((status) => {
        const col = tasks.filter((t) => t.status === status);
        return (
          <div key={status} data-testid={`column-${status}`}
            onDragOver={(e) => { if (!canMove) return; e.preventDefault(); setDragOver(status); }} onDragLeave={() => setDragOver(null)} onDrop={onDrop(status)}
            className={clsx('flex min-h-64 flex-col rounded-xl bg-slate-100 p-3 transition', dragOver === status && 'ring-2 ring-brand-500')}>
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-700">{STATUS_LABEL[status]} <span className="ml-1 text-slate-400" data-testid={`column-count-${status}`}>{col.length}</span></h3>
              {onAdd && <button className="btn-ghost p-1" aria-label={`Add task to ${STATUS_LABEL[status]}`} data-testid={`add-task-${status}`} onClick={() => onAdd(status)}><Plus size={16} /></button>}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {col.map((t) => (
                <div key={t.id} draggable={canMove} data-testid="task-card" data-task-key={t.key}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                  className={clsx('rounded-lg border border-slate-200 bg-white p-3 shadow-sm', canMove && 'cursor-grab active:cursor-grabbing')}>
                  <Link href={`/tasks/${t.id}`} className="text-sm font-medium hover:text-brand-600" data-testid="task-card-title">{t.title}</Link>
                  <div className="mt-2 flex flex-wrap gap-1">{t.labels.map((l) => <Badge key={l}>{l}</Badge>)}</div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-400" data-testid="task-card-key">{t.key}</span>
                    <div className="flex items-center gap-2">
                      {t.dueDate && <span className={clsx('text-xs', isOverdue(t.dueDate, t.status) ? 'font-semibold text-red-600' : 'text-slate-500')}>{fmtDate(t.dueDate)}</span>}
                      <PriorityBadge priority={t.priority} />
                      {t.assignee && <Avatar name={t.assignee.name} />}
                    </div>
                  </div>
                  {canMove && <select aria-label={`Move ${t.key}`} data-testid="task-card-move" className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                    value={t.status} onChange={(e) => move.mutate({ id: t.id, status: e.target.value as TaskStatus })}>
                    {TASK_STATUSES.map((s) => <option key={s} value={s}>Move to: {STATUS_LABEL[s]}</option>)}
                  </select>}
                </div>
              ))}
              {col.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Drop tasks here</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Members({ project }: { project: ProjectDetail }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const usersQ = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => api<Paginated<User>>('/users', { query: { limit: 100 } }),
    enabled: project.canManage,
  });
  const candidates = (usersQ.data?.data ?? []).filter((u) => u.isActive && !project.members.some((m) => m.id === u.id));
  const refresh = () => qc.invalidateQueries({ queryKey: ['project', project.id] });

  const add = useMutation({
    mutationFn: () => api(`/projects/${project.id}/members`, { method: 'POST', body: { userId } }),
    onSuccess: () => { toast.success('Member added'); setUserId(''); refresh(); },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (uid: string) => api(`/projects/${project.id}/members/${uid}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Member removed'); refresh(); qc.invalidateQueries({ queryKey: ['tasks'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="card p-5">
      {project.canManage && (
        <form className="mb-6 flex gap-2" data-testid="add-member-form" onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); if (userId) add.mutate(); }}>
          <select className="input max-w-xs" value={userId} onChange={(e) => setUserId(e.target.value)} data-testid="add-member-select" aria-label="User to add">
            <option value="">Select a user to add…</option>
            {candidates.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
          <button className="btn-primary" disabled={!userId || add.isPending} data-testid="add-member-submit">Add member</button>
        </form>
      )}
      <FormError message={error} />
      <ul className="divide-y divide-slate-100" data-testid="member-list">
        {project.members.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-3" data-testid="member-row">
            <div className="flex items-center gap-3">
              <Avatar name={m.name} size="md" />
              <div><p className="text-sm font-medium" data-testid="member-name">{m.name}</p><p className="text-xs text-slate-500">{m.email}</p></div>
            </div>
            <div className="flex items-center gap-2">
              {m.id === project.owner.id && <Badge tone="indigo">Owner</Badge>}
              <Badge>{m.role}</Badge>
              {project.canManage && m.id !== project.owner.id && (
                <button className="btn-ghost p-1 text-red-600" aria-label={`Remove ${m.name}`} data-testid="remove-member" onClick={() => remove.mutate(m.id)}><Trash2 size={16} /></button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Settings({ project }: { project: ProjectDetail }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({ name: project.name, description: project.description ?? '' });
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['project', project.id] }); qc.invalidateQueries({ queryKey: ['projects'] }); };

  const update = useMutation({
    mutationFn: (body: Record<string, string>) => api(`/projects/${project.id}`, { method: 'PATCH', body }),
    onSuccess: () => { toast.success('Project updated'); invalidate(); },
    onError: (e) => setError(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: () => api(`/projects/${project.id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success(`Project ${project.key} deleted`); qc.invalidateQueries({ queryKey: ['projects'] }); router.push('/projects'); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <form className="card space-y-4 p-5" data-testid="project-settings-form" onSubmit={(e) => { e.preventDefault(); setError(null); update.mutate(form); }}>
        <h2 className="font-semibold">General</h2>
        <FormError message={error} />
        <div><label className="label" htmlFor="settings-name">Name</label><input id="settings-name" data-testid="settings-name" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div><label className="label" htmlFor="settings-description">Description</label><textarea id="settings-description" data-testid="settings-description" className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
        <button className="btn-primary" data-testid="settings-save" disabled={update.isPending}>Save</button>
      </form>
      <div className="card flex flex-wrap items-center justify-between gap-4 border-red-200 p-5">
        <div><h2 className="font-semibold">Danger zone</h2><p className="text-sm text-slate-500">Archive to make read-only, or delete permanently with all tasks.</p></div>
        <div className="flex gap-2">
          <button className="btn-secondary" data-testid="archive-toggle" onClick={() => update.mutate({ status: project.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })}>
            {project.status === 'ACTIVE' ? 'Archive project' : 'Restore project'}
          </button>
          <button className="btn-danger" data-testid="delete-project" onClick={() => setConfirm(true)}>Delete project</button>
        </div>
      </div>
      <ConfirmDialog open={confirm} title={`Delete ${project.key}?`} message="This permanently deletes the project and all of its tasks and comments." busy={del.isPending}
        onClose={() => setConfirm(false)} onConfirm={() => del.mutate()} />
    </div>
  );
}
