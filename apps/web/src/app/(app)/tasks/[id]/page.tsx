'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { TaskFormModal } from '@/components/TaskFormModal';
import { Avatar, Badge, ConfirmDialog, EmptyState, PriorityBadge, Spinner, StatusBadge } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate, fmtDateTime, isOverdue } from '@/lib/format';
import { Comment, STATUS_LABEL, Task, TASK_STATUSES, TaskStatus } from '@/lib/types';

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isGuest } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [comment, setComment] = useState('');

  const taskQ = useQuery({ queryKey: ['task', id], queryFn: () => api<Task>(`/tasks/${id}`) });
  const commentsQ = useQuery({ queryKey: ['task', id, 'comments'], queryFn: () => api<Comment[]>(`/tasks/${id}/comments`), enabled: taskQ.isSuccess });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['task', id] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const status = useMutation({
    mutationFn: (s: TaskStatus) => api<Task>(`/tasks/${id}/status`, { method: 'PATCH', body: { status: s } }),
    onSuccess: (t) => { toast.success(`Status changed to ${STATUS_LABEL[t.status]}`); invalidate(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: () => api(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Task deleted'); qc.invalidateQueries({ queryKey: ['tasks'] }); router.push(`/projects/${taskQ.data?.project.id}`); },
    onError: (e) => { setConfirm(false); toast.error(errorMessage(e)); },
  });
  // The input is cleared on submit (not on success) so text typed while a save is in flight is never lost.
  const addComment = useMutation({
    mutationFn: (body: string) => api<Comment>(`/tasks/${id}/comments`, { method: 'POST', body: { body } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', id, 'comments'] }),
    onError: (e, body) => { setComment((current) => current || body); toast.error(errorMessage(e)); },
  });
  const submitComment = () => {
    const body = comment.trim();
    if (!body) return;
    setComment('');
    addComment.mutate(body);
  };
  const delComment = useMutation({
    mutationFn: (cid: string) => api(`/comments/${cid}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Comment deleted'); qc.invalidateQueries({ queryKey: ['task', id, 'comments'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (taskQ.isLoading) return <Spinner />;
  if (taskQ.isError || !taskQ.data) return <EmptyState title="Task not available" hint={errorMessage(taskQ.error)} action={<Link className="btn-secondary" href="/tasks">Back to tasks</Link>} />;
  const t = taskQ.data;

  return (
    <>
      <Link href={`/projects/${t.project.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600" data-testid="back-to-project">
        <ArrowLeft size={14} /> {t.project.name}
      </Link>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-sm text-slate-400" data-testid="task-key">{t.key}</p>
                <h1 className="text-2xl font-semibold" data-testid="task-title">{t.title}</h1>
              </div>
              {!isGuest && <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setEditOpen(true)} data-testid="edit-task-button"><Pencil size={14} /> Edit</button>
                <button className="btn-secondary text-red-600" onClick={() => setConfirm(true)} data-testid="delete-task-button" aria-label="Delete task"><Trash2 size={14} /></button>
              </div>}
            </div>
            <div className="mb-4 flex flex-wrap gap-1" data-testid="task-labels">{t.labels.map((l) => <Badge key={l}>{l}</Badge>)}</div>
            <p className="whitespace-pre-wrap text-sm text-slate-700" data-testid="task-description">{t.description || <span className="text-slate-400">No description provided.</span>}</p>
          </div>

          <div className="card p-6" data-testid="comments-section">
            <h2 className="mb-4 font-semibold">Comments <span className="text-slate-400" data-testid="comment-count">{commentsQ.data?.length ?? 0}</span></h2>
            <ul className="mb-4 space-y-4" data-testid="comment-list">
              {commentsQ.data?.map((c) => (
                <li key={c.id} className="flex gap-3" data-testid="comment-item">
                  <Avatar name={c.author.name} size="md" />
                  <div className="flex-1 rounded-lg bg-slate-50 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span><span className="font-medium text-slate-700" data-testid="comment-author">{c.author.name}</span> · {fmtDateTime(c.createdAt)}</span>
                      {(c.author.id === user?.id || user?.role === 'ADMIN') && (
                        <button className="text-red-500 hover:underline" data-testid="delete-comment" onClick={() => delComment.mutate(c.id)}>Delete</button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm" data-testid="comment-body">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            {isGuest ? <p className="text-sm text-slate-500" data-testid="comment-guest-note">Guests can read comments but not post them.</p> :
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); submitComment(); }} className="space-y-2" data-testid="comment-form">
              <textarea className="input min-h-20" placeholder="Write a comment…" value={comment} onChange={(e) => setComment(e.target.value)} data-testid="comment-input" aria-label="Comment" maxLength={2000} />
              <div className="flex justify-end"><button className="btn-primary" disabled={!comment.trim()} data-testid="comment-submit">Comment</button></div>
            </form>}
          </div>
        </div>

        <aside className="card h-fit space-y-4 p-6 text-sm" data-testid="task-details">
          <div>
            <label className="label" htmlFor="detail-status">Status</label>
            <select id="detail-status" className="input" value={t.status} disabled={isGuest} data-testid="detail-status" onChange={(e) => status.mutate(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <Row label="Current status"><StatusBadge status={t.status} /></Row>
          <Row label="Priority"><PriorityBadge priority={t.priority} /></Row>
          <Row label="Assignee"><span data-testid="detail-assignee">{t.assignee?.name ?? 'Unassigned'}</span></Row>
          <Row label="Reporter"><span data-testid="detail-reporter">{t.reporter.name}</span></Row>
          <Row label="Due date"><span data-testid="detail-due" className={isOverdue(t.dueDate, t.status) ? 'font-semibold text-red-600' : ''}>{fmtDate(t.dueDate)}{isOverdue(t.dueDate, t.status) && ' (overdue)'}</span></Row>
          <Row label="Created">{fmtDateTime(t.createdAt)}</Row>
          <Row label="Updated">{fmtDateTime(t.updatedAt)}</Row>
        </aside>
      </div>

      <TaskFormModal open={editOpen} onClose={() => setEditOpen(false)} task={t} />
      <ConfirmDialog open={confirm} title={`Delete ${t.key}?`} message="This task and its comments will be permanently deleted." busy={del.isPending}
        onClose={() => setConfirm(false)} onConfirm={() => del.mutate()} />
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-slate-500">{label}</span>{children}</div>;
}
