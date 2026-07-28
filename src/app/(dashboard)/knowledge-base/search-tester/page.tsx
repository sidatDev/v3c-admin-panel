'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Sparkles, FileText, Globe, ArrowRight } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface SearchResultItem {
  id: string;
  title: string;
  source: string;
  snippet: string;
  score: number;
}

export default function SearchTesterPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const res = await api.post<{ status: string; data: SearchResultItem[] }>('/api/kb/search-tester', { query: searchQuery });
      return res.data;
    },
    onSuccess: (data) => {
      setResults(data);
      if (data.length === 0) toast.info('No matching knowledge base snippets found.');
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Search query failed.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Search className="h-6 w-6 text-indigo-600" />
          Search Tester
        </h1>
        <p className="text-sm text-slate-500">
          Test query retrieval against indexed sitemap pages, custom text, and documents.
        </p>
      </div>

      {/* Query Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Test Query</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Type a visitor question (e.g. What is your refund policy?)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query) searchMutation.mutate(query);
            }}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => {
              if (query) searchMutation.mutate(query);
              else toast.error('Please enter a query.');
            }}
            disabled={searchMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {searchMutation.isPending ? <Sparkles className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Test Search
          </button>
        </div>
      </div>

      {/* Search Results List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Retrieved Results ({results.length})
        </h3>

        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((res) => (
              <div key={res.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {res.source === 'SITEMAP' ? (
                      <Globe className="h-4 w-4 text-blue-600" />
                    ) : (
                      <FileText className="h-4 w-4 text-indigo-600" />
                    )}
                    <h4 className="font-bold text-slate-900 text-sm">{res.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                      {res.source}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      Score: {(res.score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {res.snippet}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
            Enter a search query above to inspect matching snippets and relevance scores.
          </div>
        )}
      </div>
    </div>
  );
}
