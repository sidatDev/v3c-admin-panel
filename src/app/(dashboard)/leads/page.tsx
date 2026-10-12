'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

export default function LeadsPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const tenantSlug = user?.tenantSlug || 'v3c-system-tenant';
    router.replace(`/${tenantSlug}/leads/interested`);
  }, [router, user]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

