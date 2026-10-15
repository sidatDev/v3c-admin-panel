'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { Building2, ChevronDown, Check, Layers, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export function TenantSwitcher() {
  const { user, activeTenantId, setActiveTenant } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleLevel = user?.roleLevel || (user?.role === 'super_admin' ? 'L0_PLATFORM' : 'L4_AGENT');
  const isMultiTenantAdmin = roleLevel === 'L1_GROUP' || roleLevel === 'L0_PLATFORM';

  // Fetch accessible tenants
  const { data: accessibleTenants = [], isLoading } = useQuery<TenantItem[]>({
    queryKey: ['accessible-tenants', user?.id, user?.groupId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: TenantItem[] }>('/api/auth/accessible-tenants');
      return res.data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const urlSlug = pathname?.split('/').filter(Boolean)[0];

  // Determine current active tenant: prioritize activeTenantId, then match URL slug, then home tenant
  const currentTenant = accessibleTenants.find(t => 
    activeTenantId ? t.id === activeTenantId : false
  ) || accessibleTenants.find(t => 
    urlSlug && t.slug === urlSlug
  ) || accessibleTenants.find(t => 
    t.id === user?.tenantId
  ) || (accessibleTenants.length > 0 ? accessibleTenants[0] : null);

  const displayName = currentTenant?.name || user?.companyName || user?.tenantSlug || 'Default Company';

  // For L2 / L3 / L4 users, display static non-clickable company pill
  if (!isMultiTenantAdmin) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs">
        <Building2 className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-semibold text-slate-900 truncate max-w-[140px]">{displayName}</span>
        <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
          Company
        </span>
      </div>
    );
  }

  // For L1_GROUP and L0_PLATFORM, render interactive dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-98 cursor-pointer"
        title="Switch Company / Tenant"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded bg-indigo-50 text-indigo-600">
          {roleLevel === 'L1_GROUP' ? <Layers className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">
            {roleLevel === 'L1_GROUP' ? 'Group Company' : 'Platform Tenant'}
          </span>
          <span className="font-semibold text-slate-900 truncate max-w-[130px] leading-tight">
            {isLoading ? 'Loading...' : displayName}
          </span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Accessible Companies ({accessibleTenants.length})
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {accessibleTenants.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No accessible companies found
              </div>
            ) : (
              accessibleTenants.map((t) => {
                const isSelected = currentTenant?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setIsOpen(false);
                      setActiveTenant(t);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className={`h-3.5 w-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="flex flex-col text-left truncate">
                        <span className="truncate">{t.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal truncate">/{t.slug}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
