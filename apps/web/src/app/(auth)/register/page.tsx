'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { FormError } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter a valid email address';
    if (!PASSWORD_RULE.test(form.password)) errs.password = 'Use 8+ characters with upper, lower, number and symbol';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    setServerError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = 'text', autoComplete?: string) => (
    <div>
      <label className="label" htmlFor={`reg-${key}`}>{label}</label>
      <input id={`reg-${key}`} type={type} autoComplete={autoComplete} data-testid={`register-${key}`} className="input"
        value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
      {errors[key] && <p className="field-error" data-testid={`error-${key}`}>{errors[key]}</p>}
    </div>
  );

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold" data-testid="page-title">Create account</h1>
      <p className="mb-6 text-sm text-slate-500">New accounts start with the Member role.</p>
      <FormError message={serverError} />
      <form onSubmit={submit} noValidate className="space-y-4" data-testid="register-form">
        {field('name', 'Full name', 'text', 'name')}
        {field('email', 'Email', 'email', 'email')}
        {field('password', 'Password', 'password', 'new-password')}
        {field('confirm', 'Confirm password', 'password', 'new-password')}
        <button type="submit" className="btn-primary w-full" disabled={busy} data-testid="register-submit">{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account? <Link href="/login" className="font-medium text-brand-600" data-testid="login-link">Sign in</Link>
      </p>
    </>
  );
}
