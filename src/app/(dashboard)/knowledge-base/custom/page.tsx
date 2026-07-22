'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Plus, Trash2, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface CustomKnowledgeItem {
  id: number;
  fileName: string | null;
  content: string | null;
  createdAt: string;
}

export default function CustomKnowledgePage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: entries = [], isLoading, refetch, isRefetching } = useQuery<CustomKnowledgeItem[]>({
    queryKey: ['kb-custom'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CustomKnowledgeItem[] }>('/api/kb/custom');
      return res.data;
    },
  });

  const addSnippetMutation = useMutation({
    mutationFn: async (payload: { fileName: string; content: string }) => {
      const res = await api.post('/api/kb/custom', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-custom'] });
      toast.success('Custom knowledge snippet added!');
      setTitle('');
      setContent('');
      setIsModalOpen(false);
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to add snippet.');
    },
  });

  const deleteSnippetMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/kb/custom/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-custom'] });
      toast.success('Knowledge snippet deleted.');
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
            <FileText className="h-6 w-6 text-indigo-600" />
            Custom Knowledge
          </h1>
          <p className="text-sm text-slate-500">
            Add custom text snippets, FAQs, business rules, and raw policy guidelines.
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
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Snippet
          </button>
        </div>
      </div>

      {/* Custom Snippets Grid */}
      {entries.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{item.fileName || 'Knowledge Snippet'}</h3>
                  <button
                    onClick={() => deleteSnippetMutation.mutate(item.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {item.content}
                </p>
              </div>
              <p className="mt-4 text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                Added {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
          <FileText className="h-10 w-10 text-slate-300 mb-2" />
          <h3 className="text-sm font-semibold text-slate-900">No Custom Snippets</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Add FAQs, return policies, or instructions for your AI agent to reference.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add First Snippet
          </button>
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Custom Knowledge Snippet</h3>

            <input
              type="text"
              placeholder="Title / Reference Name (e.g. Return Policy)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <textarea
              rows={6}
              placeholder="Paste exact guidelines, FAQs, or rules here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 resize-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (content) addSnippetMutation.mutate({ fileName: title || 'Custom Snippet', content });
                  else toast.error('Please enter content.');
                }}
                disabled={addSnippetMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Save Snippet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
