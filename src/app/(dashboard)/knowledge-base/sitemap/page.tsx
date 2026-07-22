'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Globe, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface CrawledPageItem {
  id: number;
  url: string;
  title: string | null;
  content: string | null;
  enabled: boolean;
  status: string;
  error: string | null;
  lastCrawled: string | null;
  createdAt: string;
}

export default function SitemapManagementPage() {
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState('');

  const { data: pages = [], isLoading, refetch, isRefetching } = useQuery<CrawledPageItem[]>({
    queryKey: ['kb-sitemap'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CrawledPageItem[] }>('/api/kb/sitemap');
      return res.data;
    },
  });

  const addUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await api.post('/api/kb/sitemap', { url });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-sitemap'] });
      toast.success('Page submitted for crawling!');
      setNewUrl('');
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to submit URL.');
    },
  });

  const togglePageMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.put(`/api/kb/sitemap/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-sitemap'] });
      toast.success('Page status updated.');
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/kb/sitemap/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-sitemap'] });
      toast.success('Page removed from sitemap index.');
    },
  });

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
            Sitemap Management
          </h1>
          <p className="text-sm text-slate-500">
            Submit URLs to automatically crawl pages and include text in knowledge base indexing.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Add New URL Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Add Page URL</h3>
        <div className="flex gap-3">
          <input
            type="url"
            placeholder="https://example.com/about-us"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => {
              if (newUrl) addUrlMutation.mutate(newUrl);
              else toast.error('Please enter a valid URL.');
            }}
            disabled={addUrlMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Crawl & Index
          </button>
        </div>
      </div>

      {/* Crawled Pages Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Indexed Pages ({pages.length})</h3>

        {pages.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="p-3.5">URL & Title</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Enabled</th>
                  <th className="p-3.5">Last Crawled</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="p-3.5 max-w-sm">
                      <p className="font-semibold text-slate-900 truncate">{p.title || p.url}</p>
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate block text-[11px]">
                        {p.url}
                      </a>
                    </td>

                    <td className="p-3.5">
                      {p.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle className="h-3 w-3" /> Indexed
                        </span>
                      )}
                      {p.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          <Clock className="h-3 w-3 animate-spin" /> Crawling
                        </span>
                      )}
                      {p.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700" title={p.error || ''}>
                          <AlertCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.enabled}
                          onChange={() => togglePageMutation.mutate(p.id)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </td>

                    <td className="p-3.5 text-slate-500 whitespace-nowrap">
                      {p.lastCrawled ? new Date(p.lastCrawled).toLocaleString() : 'N/A'}
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => deletePageMutation.mutate(p.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No sitemap URLs indexed yet.</p>
        )}
      </div>
    </div>
  );
}
