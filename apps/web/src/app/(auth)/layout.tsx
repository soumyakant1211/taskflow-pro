import { FolderKanban } from 'lucide-react';
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-brand-700">
          <FolderKanban /> TaskFlow Pro
        </div>
        <div className="card p-8">{children}</div>
      </div>
    </div>
  );
}
