'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Globe,
  Key,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
  Edit,
  ImageIcon,
  Sparkles,
  RotateCcw,
  Layout,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

interface WebsiteItem {
  id: number;
  domain: string;
  publicKey: string;
  privateKey: string;
  packageType: string;
  createdAt: string;
}

interface BrandingData {
  companyName: string;
  pageTitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  accentColor: string;
}

interface DomainData {
  branding: BrandingData;
  websites: WebsiteItem[];
}

export default function DomainSettingsPage() {
  const { isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'websites' | 'branding'>('websites');

  // Key Visibility states
  const [showPrivateKey, setShowPrivateKey] = useState<Record<number, boolean>>({});

  // New Website Modal State
  const [newDomain, setNewDomain] = useState('');
  const [packageType, setPackageType] = useState('PRO');
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery<DomainData>({
    queryKey: ['domain-settings'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DomainData }>('/api/domain');
      return res.data;
    },
    enabled: !isLoadingAuth && isAuthenticated,
  });

  const branding = data?.branding;
  const websites = data?.websites || [];

  const resetBrandingMutation = useMutation({
    mutationFn: async (domainId?: string) => {
      const formData = new FormData();
      if (domainId) formData.append('domainId', domainId);
      formData.append('deleteLogo', 'true');
      formData.append('deleteFavicon', 'true');
      formData.append('resetTitle', 'true');
      await api.put('/api/domain/branding', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-settings'] });
      toast.success('Branding reset to default.');
    },
    onError: () => toast.error('Failed to reset branding.'),
  });

  const addWebsiteMutation = useMutation({
    mutationFn: async (payload: { domain: string; packageType: string }) => {
      return await api.post('/api/domain/websites', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-settings'] });
      toast.success('Website domain registered and keys generated!');
      setIsWebsiteModalOpen(false);
      setNewDomain('');
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to add website.');
    },
  });

  const regenerateKeysMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/api/domain/websites/${id}/regenerate-keys`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-settings'] });
      toast.success('Public & Private keys regenerated!');
    },
  });

  const deleteWebsiteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/domain/websites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-settings'] });
      toast.success('Website domain removed.');
    },
  });

  const togglePrivateKey = (id: number) => {
    setShowPrivateKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-600" />
            Domain & White-Label Branding Settings
          </h1>
          <p className="text-sm text-slate-500">
            Manage website domains, API keys, custom frontend page titles (<code className="text-xs font-mono text-indigo-600">&lt;title&gt;</code>), brand logos, and favicons per tenant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsWebsiteModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Website Domain
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('websites')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'websites'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Key className="h-4 w-4" />
          Websites & API Keys ({websites.length})
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'branding'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          White-Label Branding Settings (Tabular View)
        </button>
      </div>

      {/* TAB 1: WEBSITES & KEYS */}
      {activeTab === 'websites' && (
        <div className="space-y-4">
          {websites.length > 0 ? (
            <div className="space-y-4">
              {websites.map((w) => (
                <div key={w.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-indigo-600" />
                      <h3 className="font-bold text-slate-900 text-base">{w.domain}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                        <ShieldCheck className="h-3 w-3" /> Verified Domain
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/domain-settings/edit?domainId=${w.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100"
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit Branding
                      </Link>
                      <button
                        onClick={() => regenerateKeysMutation.mutate(w.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100"
                        title="Regenerate Public & Private Keys"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Regenerate Keys
                      </button>
                      <button
                        onClick={() => deleteWebsiteMutation.mutate(w.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5"
                        title="Delete Domain"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Public Key */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Public Key (Client Embed)</span>
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-mono text-slate-900 font-semibold truncate max-w-[240px]">{w.publicKey}</code>
                        <button
                          onClick={() => copyToClipboard(w.publicKey, 'Public Key')}
                          className="text-slate-400 hover:text-indigo-600 p-1"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Private Key */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Private Secret Key</span>
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-mono text-slate-900 font-semibold truncate max-w-[240px]">
                          {showPrivateKey[w.id] ? w.privateKey : '••••••••••••••••••••••••'}
                        </code>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePrivateKey(w.id)}
                            className="text-slate-400 hover:text-slate-700 p-1"
                          >
                            {showPrivateKey[w.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(w.privateKey, 'Private Secret Key')}
                            className="text-slate-400 hover:text-indigo-600 p-1"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              <Globe className="h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">No Websites Registered</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Add your website domain to generate public and private widget keys.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WHITE-LABEL BRANDING (TABULAR VIEW) */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layout className="h-5 w-5 text-indigo-400" />
                Tenant White-Label Branding Directory
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                View and edit brand names, frontend <code className="text-indigo-300">&lt;title&gt;</code> page headers, logos, favicons, and theme colors in a single structured table.
              </p>
            </div>
            <Link
              href="/domain-settings/edit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
            >
              <Edit className="h-4 w-4" />
              Edit Global Branding Page
            </Link>
          </div>

          {/* TABULAR BRANDING TABLE */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-6 py-4">Domain / Target Scope</th>
                    <th scope="col" className="px-6 py-4">Company / Brand Name</th>
                    <th scope="col" className="px-6 py-4">Frontend Page Title (&lt;title&gt;)</th>
                    <th scope="col" className="px-6 py-4">Accent Color</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions (CRUD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Domain Specific Rows */}
                  {websites.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-indigo-600" />
                          <span className="font-bold text-slate-900">{w.domain}</span>
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                            Verified
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {branding?.companyName || 'V3C Platform'}
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-indigo-700 font-semibold max-w-[220px] truncate block">
                          {branding?.pageTitle || `${branding?.companyName || 'V3C Platform'}'s Workspace`}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-5 w-5 rounded-full border border-slate-300"
                            style={{ backgroundColor: branding?.accentColor || '#4F46E5' }}
                          />
                          <span className="font-mono text-[11px] font-semibold text-slate-700 uppercase">
                            {branding?.accentColor || '#4F46E5'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/domain-settings/edit?domainId=${w.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit Page
                          </Link>
                          <button
                            onClick={() => resetBrandingMutation.mutate(String(w.id))}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
                            title="Reset Domain Branding"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Website Modal */}
      {isWebsiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Website Domain</h3>

            <input
              type="text"
              placeholder="Domain URL (e.g. app.mycompany.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Package Plan</label>
              <select
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
              >
                <option value="PRO">PRO Plan</option>
                <option value="ENTERPRISE">ENTERPRISE Plan</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsWebsiteModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newDomain) addWebsiteMutation.mutate({ domain: newDomain, packageType });
                  else toast.error('Please enter domain name.');
                }}
                disabled={addWebsiteMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Generate Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
