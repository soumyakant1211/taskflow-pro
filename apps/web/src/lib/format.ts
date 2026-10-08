export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const isOverdue = (due: string | null, status: string) =>
  !!due && status !== 'DONE' && new Date(due).getTime() < Date.now();

export const toDateInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export const initials = (name: string) =>
  name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
