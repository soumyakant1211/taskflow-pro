'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { toDateInput } from '@/lib/format';
import { Member, ProjectSummary, Paginated, Task, TASK_PRIORITIES, TASK_STATUSES, STATUS_LABEL, TaskPriority, TaskStatus } from '@/lib/types';
import { FormError, Modal } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  task?: Task;               // edit mode when set
  projectId?: string;        // preselected project for create
  members?: Member[];
  defaultStatus?: TaskStatus;
}

export function TaskFormModal({ open, onClose, task, projectId, members, defaultStatus }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ projectId: '', title: '', description: '', status: 'TODO' as TaskStatus, priority: 'MEDIUM' as TaskPriority, assigneeId: '', dueDate: '', labels: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({}); setServerError(null);
    setForm({
      projectId: task?.project.id ?? projectId ?? '',
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? defaultStatus ?? 'TODO',
      priority: task?.priority ?? 'MEDIUM',
      assigneeId: task?.assignee?.id ?? '',
      dueDate: toDateInput(task?.dueDate),
      labels: task?.labels.join(', ') ?? '',
    });
  }, [open, task, projectId, defaultStatus]);

  const projectsQ = useQuery({
    queryKey: ['projects', 'picker'],
    queryFn: () => api<Paginated<ProjectSummary>>('/projects', { query: { limit: 100, status: 'ACTIVE' } }),
    enabled: open && !projectId && !task,
  });
  const membersQ = useQuery({
    queryKey: ['project', form.projectId, 'members'],
    queryFn: () => api<{ members: Member[] }>(`/projects/${form.projectId}`).then((p) => p.members),
    enabled: open && !!form.projectId && !members,
  });
  const memberOptions = members ?? membersQ.data ?? [];

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title, description: form.description || undefined, status: form.status, priority: form.priority,
        assigneeId: form.assigneeId || (task ? null : undefined),
        dueDate: form.dueDate || (task ? null : undefined),
        labels: form.labels.split(',').map((l) => l.trim()).filter(Boolean),
      };
      return task
        ? api<Task>(`/tasks/${task.id}`, { method: 'PATCH', body })
        : api<Task>('/tasks', { method: 'POST', body: { ...body, projectId: form.projectId } });
    },
    onSuccess: (t) => {
      toast.success(task ? `${t.key} updated` : `${t.key} created`);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', t.id] });
      qc.invalidateQueries({ queryKey: ['project'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (e) => setServerError(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.projectId) errs.projectId = 'Project is required';
    if (form.title.trim().length < 3) errs.title = 'Title must be at least 3 characters';
    if (form.title.length > 120) errs.title = 'Title must be at most 120 characters';
    setErrors(errs);
    setServerError(null);
    if (!Object.keys(errs).length) save.mutate();
  };

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title={task ? `Edit ${task.key}` : 'Create task'} testId="task-form-modal">
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={serverError} />
        {!task && !projectId && (
          <div>
            <label className="label" htmlFor="task-project">Project</label>
            <select id="task-project" data-testid="task-project" className="input" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, assigneeId: '' }))}>
              <option value="">Select project…</option>
              {projectsQ.data?.data.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
            </select>
            {errors.projectId && <p className="field-error" data-testid="error-projectId">{errors.projectId}</p>}
          </div>
        )}
        <div>
          <label className="label" htmlFor="task-title">Title</label>
          <input id="task-title" data-testid="task-title" className="input" value={form.title} onChange={set('title')} placeholder="What needs to be done?" />
          {errors.title && <p className="field-error" data-testid="error-title">{errors.title}</p>}
        </div>
        <div>
          <label className="label" htmlFor="task-description">Description</label>
          <textarea id="task-description" data-testid="task-description" className="input min-h-24" value={form.description} onChange={set('description')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="task-status">Status</label>
            <select id="task-status" data-testid="task-status" className="input" value={form.status} onChange={set('status')}>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="task-priority">Priority</label>
            <select id="task-priority" data-testid="task-priority" className="input" value={form.priority} onChange={set('priority')}>
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="task-assignee">Assignee</label>
            <select id="task-assignee" data-testid="task-assignee" className="input" value={form.assigneeId} onChange={set('assigneeId')}>
              <option value="">Unassigned</option>
              {memberOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="task-due">Due date</label>
            <input id="task-due" type="date" data-testid="task-due-date" className="input" value={form.dueDate} onChange={set('dueDate')} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="task-labels">Labels <span className="font-normal text-slate-400">(comma separated)</span></label>
          <input id="task-labels" data-testid="task-labels" className="input" value={form.labels} onChange={set('labels')} placeholder="frontend, bug" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={save.isPending} data-testid="task-submit">
            {save.isPending ? 'Saving…' : task ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
