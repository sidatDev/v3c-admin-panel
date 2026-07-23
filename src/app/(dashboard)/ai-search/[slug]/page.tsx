'use client';

import React, { useState, useEffect, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Key, Copy, Eye, EyeOff, Globe, Play, Edit2, Trash2, ArrowLeft, RefreshCw, FileText, Search, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

interface PageItem {
  id: number;
  url: string;
  title: string | null;
  status: string;
  error: string | null;
  lastCrawled: string | null;
}

interface DomainDetailData {
  id: number;
  domain: string;
  publicKey: string;
  privateKey: string;
  name: string;
  crawlLimit: number;
  customKb: string;
  createdAt: string;
  liveStatus: {
    crawlerStatus: string;
    pagesCrawledCount: number;
    totalPagesCount: number;
    pages: PageItem[];
  };
}

export default function AISearchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();

  // Unwrap params Promise for Next.js 15
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug || '';
  const slugParts = slug.split('-');
  const domainId = parseInt(slugParts[slugParts.length - 1], 10);

  const [showKeys, setShowKeys] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Search Tester States
  const [query, setQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState(true);
  const [testResults, setTestResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Edit Form States
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editLimit, setEditLimit] = useState('50');
  const [editCustomKb, setEditCustomKb] = useState('');

  // Fetch Domain configuration
  const { data: detail, isLoading, error, refetch, isRefetching } = useQuery<DomainDetailData>({
    queryKey: ['ai-search-detail', domainId],
    queryFn: async () => {
      if (isNaN(domainId)) throw new Error('Invalid Domain ID.');
      const res = await api.get<{ status: string; data: DomainDetailData }>(`/api/ai-search/${domainId}`);
      return res.data;
    },
    enabled: !isNaN(domainId)
  });

  // Pre-populate edit form fields on load
  useEffect(() => {
    if (detail) {
      setEditName(detail.name);
      setEditDomain(detail.domain);
      setEditLimit(detail.crawlLimit.toString());
      setEditCustomKb(detail.customKb || '');
    }
  }, [detail]);

  // Trigger Crawl Mutation
  const triggerCrawlMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/api/ai-search/${domainId}/crawl`, {});
    },
    onSuccess: () => {
      toast.success('Crawl job successfully initiated!');
      queryClient.invalidateQueries({ queryKey: ['ai-search-detail', domainId] });
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Failed to trigger crawling.');
    }
  });

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: { domain: string; name: string; limit: number; customKb: string }) => {
      await api.put(`/api/ai-search/${domainId}`, payload);
    },
    onSuccess: () => {
      toast.success('Configuration updated successfully!');
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['ai-search-detail', domainId] });
      queryClient.invalidateQueries({ queryKey: ['ai-search-list'] });
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Failed to save settings.');
    }
  });

  // Run Search Test
  const runSearchTest = async () => {
    if (!query) {
      toast.error('Please enter a query.');
      return;
    }
    if (!detail) return;

    setIsSearching(true);
    setTestResults(null);

    try {
      // Call public search API served on AI Search port (3725)
      const searchUrl = 'http://localhost:3725/api/public/search';
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          publicKey: detail.publicKey,
          aiAnswer
        })
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setTestResults(data);
      } else {
        toast.error(data.message || 'Search execution failed.');
      }
    } catch (err: any) {
      toast.error('Failed to connect to local Search Microservice.');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (isNaN(domainId) || error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="text-lg font-bold text-slate-900">Workspace Error</h3>
        <p className="text-xs text-slate-500">Invalid search profile slug or access is restricted.</p>
        <button onClick={() => router.push('/ai-search')} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">
          Back to Listings
        </button>
      </div>
    );
  }

  if (isLoading || !detail) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const liveStatus = detail.liveStatus;
  const isCrawling = liveStatus.crawlerStatus === 'CRAWLING';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!user?.domainId && (
            <button
              onClick={() => router.push('/ai-search')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{detail.name}</h1>
              {isCrawling && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                  Crawling...
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{detail.domain}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Edit2 className="h-4 w-4" />
            Edit Settings
          </button>
          <button
            onClick={() => triggerCrawlMutation.mutate()}
            disabled={triggerCrawlMutation.isPending || isCrawling}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Crawl Website
          </button>
        </div>
      </div>

      {/* Main Grid: Details + Playground */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Keys and Settings Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Connection Keys</h3>

            <div className="space-y-4">
              {/* Public Key */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Public Key</span>
                  <button onClick={() => copyToClipboard(detail.publicKey, 'Public Key')} className="text-indigo-600 hover:text-indigo-700 font-bold">
                    Copy
                  </button>
                </div>
                <code className="block text-xs font-mono text-slate-700 font-semibold bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg truncate">
                  {detail.publicKey}
                </code>
              </div>

              {/* Private Key */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Private Key</span>
                  <div className="flex gap-2">
                    <button onClick={() => setShowKeys(!showKeys)} className="text-slate-500 hover:text-slate-700">
                      {showKeys ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => copyToClipboard(detail.privateKey, 'Private Key')} className="text-indigo-600 hover:text-indigo-700 font-bold">
                      Copy
                    </button>
                  </div>
                </div>
                <code className="block text-xs font-mono text-slate-700 font-semibold bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg truncate">
                  {showKeys ? detail.privateKey : '••••••••••••••••••••••••••••••••'}
                </code>
              </div>
            </div>
          </div>

          {/* Crawler Progress Stats Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Crawler Statistics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">Pages Crawled</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{liveStatus.pagesCrawledCount || liveStatus.pages.length}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">Pages Limit</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{detail.crawlLimit}</p>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-start gap-1 bg-indigo-50/50 p-3 rounded-lg border border-indigo-50">
              <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                To modify crawled urls or exclude sub-paths, adjust sitemap settings inside the main Knowledge Base section.
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Tabular Crawler Status & Search Tester */}
        <div className="lg:col-span-2 space-y-6">
          {/* RAG Tester Sandbox */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">AI Search Playground</h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask your website a question..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearchTest()}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
              <button
                onClick={runSearchTest}
                disabled={isSearching}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                Query
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiAnswer}
                  onChange={(e) => setAiAnswer(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Generate RAG response with OpenAI
              </label>
            </div>

            {/* Test Runner Output */}
            {testResults && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                {testResults.answer && (
                  <div className="rounded-xl bg-indigo-50/50 p-4 border border-indigo-100/50 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> AI Response
                    </p>
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{testResults.answer}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Top Search Results</p>
                  {testResults.results?.map((res: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
                          {res.title || res.url}
                        </a>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Similarity: {res.score}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed italic">"{res.snippet}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Crawled Pages Listing Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Crawled Subpages ({liveStatus.pages.length})</h3>

            {liveStatus.pages.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[300px]">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-100 font-semibold uppercase text-slate-500 sticky top-0">
                    <tr>
                      <th className="p-3">Title / Page URL</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Last Crawled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveStatus.pages.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="p-3 max-w-[280px]">
                          <p className="font-bold text-slate-900 truncate">{p.title || 'Untitled Page'}</p>
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-600 truncate block text-[10px]">
                            {p.url}
                          </a>
                        </td>
                        <td className="p-3">
                          {p.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              Success
                            </span>
                          ) : p.status === 'FAILED' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700" title={p.error || ''}>
                              Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500">
                          {p.lastCrawled ? new Date(p.lastCrawled).toLocaleString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No pages have been indexed yet. Trigger a crawl to start ingestion.</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Edit Crawler Settings</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Configuration Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Website URL to Crawl</label>
                <input
                  type="text"
                  value={editDomain}
                  onChange={(e) => setEditDomain(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Pages Crawl Limit</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={editLimit}
                  onChange={(e) => setEditLimit(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Custom Knowledgebase Text (Optional)</label>
                <textarea
                  placeholder="Paste any company context, FAQs, or raw baseline instructions here to index them directly..."
                  value={editCustomKb}
                  onChange={(e) => setEditCustomKb(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 min-h-[120px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editDomain) {
                    updateSettingsMutation.mutate({
                      domain: editDomain,
                      name: editName,
                      limit: parseInt(editLimit, 10) || 50,
                      customKb: editCustomKb
                    });
                  } else {
                    toast.error('Website URL is required.');
                  }
                }}
                disabled={updateSettingsMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
