'use client';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { initials } from '@/lib/format';
import { STATUS_LABEL, TaskPriority, TaskStatus } from '@/lib/types';

const STATUS_STYLE: Record<TaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-amber-100 text-amber-800',
  DONE: 'bg-emerald-100 text-emerald-700',
};
const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-sky-100 text-sky-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span data-testid="status-badge" className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span data-testid="priority-badge" className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_STYLE[priority])}>{priority}</span>;
}

export function Badge({ children, tone = 'slate', testId }: { children: ReactNode; tone?: 'slate' | 'green' | 'red' | 'indigo'; testId?: string }) {
  const tones = { slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-100 text-emerald-700', red: 'bg-red-100 text-red-700', indigo: 'bg-brand-100 text-brand-700' };
  return <span data-testid={testId} className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span title={name} className={clsx('inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700', size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-9 w-9 text-sm')}>
      {initials(name)}
    </span>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div data-testid="spinner" className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 data-testid="page-title" className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ open, title, onClose, children, testId = 'modal' }: { open: boolean; title: string; onClose: () => void; children: ReactNode; testId?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} data-testid={testId} className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Close" data-testid="modal-close" className="btn-ghost p-1" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onClose, busy }: {
  open: boolean; title: string; message: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void; busy?: boolean;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} testId="confirm-dialog">
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} data-testid="confirm-cancel">Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy} data-testid="confirm-ok">{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function Pagination({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (p: number) => void }) {
  return (
    <div data-testid="pagination" className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span data-testid="pagination-info">Page {page} of {totalPages} · {total} total</span>
      <div className="flex gap-2">
        <button className="btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)} data-testid="pagination-prev">Previous</button>
        <button className="btn-secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)} data-testid="pagination-next">Next</button>
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <div role="alert" data-testid="form-error" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>;
}
