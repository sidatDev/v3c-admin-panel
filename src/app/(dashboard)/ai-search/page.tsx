'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Plus, Key, Copy, Eye, EyeOff, Globe, Trash2, ArrowRight, RefreshCw, FileText } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

interface SearchDomainItem {
  id: number;
  domain: string;
  publicKey: string;
  name: string;
  crawlLimit: number;
  pagesCount: number;
  createdAt: string;
}

export default function AISearchListingPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createdKeys, setCreatedKeys] = useState<{ publicKey: string; domain: string } | null>(null);

  // Form states
  const [domain, setDomain] = useState('');
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('50');
  const [customKb, setCustomKb] = useState('');

  // Query listings
  const { data: domains = [], isLoading, refetch, isRefetching } = useQuery<SearchDomainItem[]>({
    queryKey: ['ai-search-list'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: SearchDomainItem[] }>('/api/ai-search');
      return res.data;
    }
  });

  const getSlug = (d: { domain: string; id: number }) => {
    const cleanDomain = d.domain.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${cleanDomain}-${d.id}`;
  };

  // Redirect locked users immediately
  useEffect(() => {
    if (user?.domainId && domains.length > 0) {
      const lockedDomain = domains.find(d => d.id === user.domainId);
      if (lockedDomain) {
        router.replace(`/ai-search/${getSlug(lockedDomain)}`);
      }
    }
  }, [user, domains, router]);

  // Create Domain Mutation
  const createDomainMutation = useMutation({
    mutationFn: async (payload: { domain: string; name: string; limit: number; customKb?: string }) => {
      const res = await api.post<{ status: string; data: any }>('/api/ai-search', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-search-list'] });
      toast.success('AI Search configuration created!');
      setCreatedKeys({ publicKey: data.publicKey, domain: data.domain });
      setIsAddModalOpen(false);
      setDomain('');
      setName('');
      setLimit('50');
      setCustomKb('');
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to create AI Search domain.');
    }
  });

  // Delete Domain Mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/ai-search/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-search-list'] });
      toast.success('Domain configuration deleted.');
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to delete domain.');
    }
  });

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

  // If locked, render an loading/empty state during redirect
  if (user?.domainId) {
    return (
      <div className="flex h-[60vh] items-center justify-center space-y-4 flex-col">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Redirecting to domain workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            AI Search Microservice Config
          </h1>
          <p className="text-sm text-slate-500">
            Configure website crawling parameters, view index sizes, and obtain public keys.
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
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Main Grid List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {domains.length > 0 ? (
          domains.map((d) => (
            <div
              key={d.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:border-indigo-100"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Globe className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {d.pagesCount} Pages Crawled
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 truncate">{d.name}</h3>
                <p className="text-xs text-indigo-600 font-semibold tracking-tight truncate mb-3">{d.domain}</p>

                <div className="mt-4 rounded-xl bg-slate-50 p-3 space-y-2 border border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium"><Key className="h-3 w-3" /> Public Key:</span>
                    <button
                      onClick={() => copyToClipboard(d.publicKey, 'Public Key')}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5"
                    >
                      Copy
                    </button>
                  </div>
                  <code className="block text-[11px] font-mono text-slate-700 font-semibold truncate bg-white border border-slate-100 px-2 py-1.5 rounded-lg select-all">
                    {d.publicKey}
                  </code>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this AI Search config? All page vectors and analytics will be permanently destroyed.')) {
                      deleteDomainMutation.mutate(d.id);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <button
                  onClick={() => router.push(`/ai-search/${getSlug(d)}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Configure
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <Globe className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-sm font-bold text-slate-900">No websites configured</h3>
            <p className="mt-2 text-xs text-slate-500">Get started by creating a new search crawler configuration.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Add Website
            </button>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Configure AI Search Crawl Website</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Config Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sidat Support Agent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Website URL to Crawl</label>
                <input
                  type="text"
                  placeholder="e.g. https://sidat.net"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Pages Crawl Limit</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Custom Knowledgebase Text (Optional)</label>
                <textarea
                  placeholder="Paste any company context, FAQs, or raw baseline instructions here to index them directly..."
                  value={customKb}
                  onChange={(e) => setCustomKb(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 min-h-[120px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (domain) {
                    createDomainMutation.mutate({ 
                      domain, 
                      name, 
                      limit: parseInt(limit, 10) || 50,
                      customKb 
                    });
                  } else {
                    toast.error('Website URL is required.');
                  }
                }}
                disabled={createDomainMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Create & Generate Keys
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys Display Modal */}
      {createdKeys && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center">API Key Generated!</h3>
            <p className="text-xs text-slate-500 text-center">
              Your AI Search workspace for <strong>{createdKeys.domain}</strong> is ready. copy the public key to embed the widget in your website.
            </p>

            <div className="rounded-xl bg-slate-50 p-4 space-y-2 border border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Public Key</span>
                <button
                  onClick={() => copyToClipboard(createdKeys.publicKey, 'Public Key')}
                  className="text-indigo-600 hover:text-indigo-700 font-bold"
                >
                  Copy Key
                </button>
              </div>
              <code className="block text-xs font-mono text-slate-800 font-semibold bg-white border border-slate-100 px-3 py-2.5 rounded-lg break-all select-all">
                {createdKeys.publicKey}
              </code>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={() => setCreatedKeys(null)}
                className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
