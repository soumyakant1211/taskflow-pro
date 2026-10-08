'use client';
import clsx from 'clsx';
import { Activity, FolderKanban, LayoutDashboard, ListTodo, LogOut, Menu, UserCog, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Avatar, Badge, Spinner } from './ui';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
  { href: '/projects', label: 'Projects', icon: FolderKanban, testId: 'nav-projects' },
  { href: '/tasks', label: 'Tasks', icon: ListTodo, testId: 'nav-tasks' },
  { href: '/admin/users', label: 'Users', icon: Users, testId: 'nav-users', admin: true },
  { href: '/admin/activity', label: 'Audit log', icon: Activity, testId: 'nav-activity', admin: true },
  { href: '/profile', label: 'Profile', icon: UserCog, testId: 'nav-profile' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, loggedOut, logout, isGuest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(loggedOut ? '/login' : `/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, loggedOut, router, pathname]);

  if (loading || !user) return <Spinner />;

  return (
    <div className="flex min-h-screen">
      <aside className={clsx('fixed inset-y-0 left-0 z-40 w-60 border-r border-slate-200 bg-white p-4 transition md:static md:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2 text-lg font-bold text-brand-700" data-testid="brand">
          <FolderKanban /> TaskFlow Pro
        </Link>
        <nav className="space-y-1" data-testid="sidebar">
          {NAV.filter((n) => !n.admin || user.role === 'ADMIN').map(({ href, label, icon: Icon, testId }) => (
            <Link key={href} href={href} data-testid={testId} onClick={() => setOpen(false)}
              className={clsx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                pathname.startsWith(href) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <button className="btn-ghost p-1 md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></button>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div data-testid="current-user-name" className="text-sm font-medium">{user.name}</div>
              <Badge testId="current-user-role" tone="indigo">{user.role}</Badge>
            </div>
            <Avatar name={user.name} size="md" />
            <button className="btn-ghost" onClick={() => logout()} data-testid="logout-button" aria-label="Log out"><LogOut size={18} /></button>
          </div>
        </header>
        {isGuest && (
          <div role="status" data-testid="guest-banner" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <span><strong>Guest mode:</strong> you can look around, but you can&apos;t make changes.</span>
            <button className="font-semibold underline underline-offset-2" data-testid="guest-signup" onClick={() => logout('/register')}>Create a free account</button>
          </div>
        )}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
