'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Badge, EmptyState, FormError, Modal, PageHeader, Pagination, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Paginated, ProjectSummary } from '@/lib/types';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status, page }],
    queryFn: () => api<Paginated<ProjectSummary>>('/projects', { query: { search, status, page, limit: 9 } }),
  });

  return (
    <>
      <PageHeader title="Projects" subtitle="All projects you are a member of"
        actions={canCreate && <button className="btn-primary" onClick={() => setOpen(true)} data-testid="new-project-button"><Plus size={16} /> New project</button>} />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input className="input pl-9" placeholder="Search by name or key…" data-testid="project-search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-40" value={status} data-testid="project-status-filter" onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {isLoading ? <Spinner /> : !data?.data.length ? (
        <EmptyState title="No projects found" hint={search ? 'Try a different search.' : canCreate ? 'Create your first project.' : 'Ask a manager to add you to a project.'} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="project-list">
            {data.data.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="card block p-5 transition hover:border-brand-500" data-testid="project-card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-brand-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-700" data-testid="project-key">{p.key}</span>
                  <Badge tone={p.status === 'ACTIVE' ? 'green' : 'slate'} testId="project-status">{p.status}</Badge>
                </div>
                <h3 className="font-semibold" data-testid="project-name">{p.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{p.description || 'No description'}</p>
                <div className="mt-4 flex justify-between text-xs text-slate-500">
                  <span data-testid="project-task-count">{p.openTaskCount} open / {p.taskCount} tasks</span>
                  <span>{p.memberCount} members · {p.owner.name}</span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />
        </>
      )}
      <CreateProjectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({ key: '', name: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => api<{ id: string; key: string }>('/projects', { method: 'POST', body: { ...form, description: form.description || undefined } }),
    onSuccess: (p) => {
      toast.success(`Project ${p.key} created`);
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setForm({ key: '', name: '', description: '' });
      onClose();
      router.push(`/projects/${p.id}`);
    },
    onError: (e) => setServerError(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^[A-Za-z]{2,6}$/.test(form.key)) errs.key = 'Key must be 2–6 letters';
    if (form.name.trim().length < 3) errs.name = 'Name must be at least 3 characters';
    setErrors(errs); setServerError(null);
    if (!Object.keys(errs).length) create.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="New project" testId="project-form-modal">
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={serverError} />
        <div>
          <label className="label" htmlFor="project-key">Key</label>
          <input id="project-key" data-testid="project-key-input" className="input uppercase" maxLength={6} value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase() }))} placeholder="CRM" />
          {errors.key && <p className="field-error" data-testid="error-key">{errors.key}</p>}
        </div>
        <div>
          <label className="label" htmlFor="project-name">Name</label>
          <input id="project-name" data-testid="project-name-input" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          {errors.name && <p className="field-error" data-testid="error-name">{errors.name}</p>}
        </div>
        <div>
          <label className="label" htmlFor="project-description">Description</label>
          <textarea id="project-description" data-testid="project-description-input" className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={create.isPending} data-testid="project-submit">Create project</button>
        </div>
      </form>
    </Modal>
  );
}
