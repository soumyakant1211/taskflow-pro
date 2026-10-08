import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-4xl font-bold" data-testid="not-found-title">404</h1>
      <p className="text-slate-500">This page does not exist.</p>
      <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
    </div>
  );
}
