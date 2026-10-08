'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { FormError } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function LoginForm() {
  const { login, loginAsGuest, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace(params.get('next') ?? '/dashboard');
  }, [user, router, params]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    setServerError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold" data-testid="page-title">Sign in</h1>
      <p className="mb-6 text-sm text-slate-500">Welcome back! Enter your credentials.</p>
      {params.get('expired') && <div data-testid="session-expired" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Your session expired. Please sign in again.</div>}
      <FormError message={serverError} />
      <form onSubmit={submit} noValidate className="space-y-4" data-testid="login-form">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" data-testid="login-email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          {errors.email && <p className="field-error" data-testid="error-email">{errors.email}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" data-testid="login-password" className="input pr-16" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" data-testid="toggle-password" className="absolute inset-y-0 right-2 text-xs font-medium text-brand-600" onClick={() => setShowPassword((s) => !s)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && <p className="field-error" data-testid="error-password">{errors.password}</p>}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={busy} data-testid="login-submit">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
      <button type="button" className="btn-secondary w-full" disabled={busy} data-testid="guest-login"
        onClick={async () => { setServerError(null); setBusy(true); try { await loginAsGuest(); } catch (err) { setServerError(errorMessage(err)); } finally { setBusy(false); } }}>
        Continue as guest
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">Look around with read-only access. No sign-up needed.</p>
      <p className="mt-6 text-center text-sm text-slate-500">
        New here? <Link href="/register" className="font-medium text-brand-600" data-testid="register-link">Create an account</Link>
      </p>
      <details className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        <summary className="cursor-pointer font-medium">Demo accounts</summary>
        <p className="mt-2">admin@taskflow.dev · manager@taskflow.dev · member@taskflow.dev<br />Password: <code>Password@123</code></p>
      </details>
    </>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
