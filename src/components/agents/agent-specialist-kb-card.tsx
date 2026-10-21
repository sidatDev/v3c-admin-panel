'use client';

import React, { useEffect, useState } from 'react';
import { Database, ShieldCheck, Layers } from 'lucide-react';
import { api } from '@/lib/api';

export interface KbOption {
  id: string;
  name: string;
  description: string | null;
}

interface AgentSpecialistKbCardProps {
  agentType: string;
  isDefault: boolean;
  knowledgeBaseId: string | null;
  onChange: (updates: { type?: string; isDefault?: boolean; knowledgeBaseId?: string | null }) => void;
}

export const SPECIALIST_AGENT_TYPES = [
  { value: 'primary', label: 'Primary (Main Triage & General Assistant)' },
  { value: 'sales', label: 'Sales Specialist (Pricing, Packages & Pre-Sales)' },
  { value: 'support', label: 'Support Specialist (Technical & Customer Help)' },
  { value: 'complaint', label: 'Complaint & Escalation Specialist' },
  { value: 'general', label: 'General Domain Agent' },
];

export function AgentSpecialistKbCard({
  agentType,
  isDefault,
  knowledgeBaseId,
  onChange,
}: AgentSpecialistKbCardProps) {
  const [kbs, setKbs] = useState<KbOption[]>([]);

  useEffect(() => {
    let mounted = true;
    api
      .get<{ status: string; data: KbOption[] }>('/api/dashboard/knowledge-bases')
      .then((res) => {
        if (mounted && res?.data) {
          setKbs(res.data);
        }
      })
      .catch(() => {
        // Silent fallback if no KBs yet
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-950">
          <Layers className="h-4 w-4 text-indigo-600" />
          Specialist Intent Role &amp; Knowledge Base Assignment
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(isDefault)}
            onChange={(e) => onChange({ isDefault: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Set as Default Tenant Agent
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Specialist Agent Type (Orchestrator Routing)
          </label>
          <select
            value={agentType || 'general'}
            onChange={(e) => onChange({ type: e.target.value })}
            className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
          >
            {SPECIALIST_AGENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Linked Knowledge Base (Scoped RAG Vector Search)
          </label>
          <div className="relative">
            <select
              value={knowledgeBaseId || ''}
              onChange={(e) => onChange({ knowledgeBaseId: e.target.value ? e.target.value : null })}
              className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">🌐 Global Tenant Knowledge Base (All Chunks / Fallback)</option>
              {kbs.map((kb) => (
                <option key={kb.id} value={kb.id}>
                  📚 {kb.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
