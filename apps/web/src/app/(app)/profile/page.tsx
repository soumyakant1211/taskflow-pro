'use client';
import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Badge, FormError, PageHeader } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { User } from '@/lib/types';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

export default function ProfilePage() {
  const { user, setUser, isGuest } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState<string | null>(null);

  const saveProfile = useMutation({
    mutationFn: () => api<User>('/auth/me', { method: 'PATCH', body: { name } }),
    onSuccess: (u) => { setUser(u); toast.success('Profile updated'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const changePw = useMutation({
    mutationFn: () => api('/auth/change-password', { method: 'POST', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } }),
    onSuccess: () => { toast.success('Password changed'); setPw({ currentPassword: '', newPassword: '', confirm: '' }); },
    onError: (e) => setPwError(errorMessage(e)),
  });

  const submitPw = (e: FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!PASSWORD_RULE.test(pw.newPassword)) return setPwError('Use 8+ characters with upper, lower, number and symbol');
    if (pw.newPassword !== pw.confirm) return setPwError('Passwords do not match');
    changePw.mutate();
  };

  if (!user) return null;
  return (
    <>
      <PageHeader title="Profile" subtitle={<span>{user.email} · <Badge tone="indigo">{user.role}</Badge></span>} />
      {isGuest && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="profile-guest-note">The guest profile is shared and can&apos;t be changed.</p>}
      <fieldset disabled={isGuest} className="grid gap-6 lg:grid-cols-2">
        <form className="card space-y-4 p-6" data-testid="profile-form" onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(); }}>
          <h2 className="font-semibold">Personal info</h2>
          <div><label className="label" htmlFor="profile-name">Full name</label><input id="profile-name" className="input" data-testid="profile-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <button className="btn-primary" data-testid="profile-save" disabled={saveProfile.isPending || name.trim().length < 2}>Save</button>
        </form>
        <form className="card space-y-4 p-6" data-testid="password-form" onSubmit={submitPw}>
          <h2 className="font-semibold">Change password</h2>
          <FormError message={pwError} />
          {(['currentPassword', 'newPassword', 'confirm'] as const).map((k) => (
            <div key={k}>
              <label className="label" htmlFor={`pw-${k}`}>{{ currentPassword: 'Current password', newPassword: 'New password', confirm: 'Confirm new password' }[k]}</label>
              <input id={`pw-${k}`} type="password" className="input" data-testid={`pw-${k}`} value={pw[k]} onChange={(e) => setPw((p) => ({ ...p, [k]: e.target.value }))} />
            </div>
          ))}
          <button className="btn-primary" data-testid="pw-submit" disabled={changePw.isPending}>Update password</button>
        </form>
      </fieldset>
    </>
  );
}
