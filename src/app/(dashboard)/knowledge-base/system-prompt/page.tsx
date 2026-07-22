'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Terminal, Save, RefreshCw, Sparkles } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

const PROMPT_TEMPLATES = [
  {
    name: 'Standard Customer Support',
    prompt: `You are a polite, helpful customer support assistant for V3C Platform. Answer questions clearly, accurately, and assist visitors with product navigation and inquiries.`,
  },
  {
    name: 'Sales & Lead Generation Agent',
    prompt: `You are an energetic sales consultant for V3C. Guide visitors through features, highlight pricing benefits, answer FAQs, and encourage users to book a demo or submit their email/phone.`,
  },
  {
    name: 'Strict FAQ & Helpdesk Assistant',
    prompt: `You are a technical helpdesk assistant. Only answer questions using verified facts from the Knowledge Base. If information is unavailable, politely offer to connect the visitor with human support.`,
  },
];

export default function SystemPromptPage() {
  const queryClient = useQueryClient();
  const [promptText, setPromptText] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery<{ systemPrompt: string }>({
    queryKey: ['kb-system-prompt'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: { systemPrompt: string } }>('/api/kb/system-prompt');
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.systemPrompt) {
      setPromptText(data.systemPrompt);
    }
  }, [data]);

  const updatePromptMutation = useMutation({
    mutationFn: async (systemPrompt: string) => {
      await api.put('/api/kb/system-prompt', { systemPrompt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-system-prompt'] });
      toast.success('System Prompt saved successfully!');
    },
    onError: (error) => {
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error('Failed to save System Prompt.');
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
            <Terminal className="h-6 w-6 text-indigo-600" />
            System Prompt
          </h1>
          <p className="text-sm text-slate-500">
            Define primary system behavior instructions, guardrails, and agent persona rules.
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
            onClick={() => updatePromptMutation.mutate(promptText)}
            disabled={updatePromptMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Templates Selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" /> Quick Templates
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {PROMPT_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.name}
              onClick={() => setPromptText(tmpl.prompt)}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 text-left transition-all"
            >
              <h4 className="text-xs font-bold text-slate-900">{tmpl.name}</h4>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{tmpl.prompt}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">System Instructions Editor</h3>
          <span className="text-xs text-slate-400 font-mono">{promptText.length} characters</span>
        </div>

        <textarea
          rows={12}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Enter system prompt instructions for the AI assistant..."
          className="w-full rounded-xl border border-slate-200 p-4 text-xs font-mono leading-relaxed text-slate-900 outline-none focus:border-indigo-500 bg-slate-50/30"
        />
      </div>
    </div>
  );
}
