'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, RefreshCw, Layers } from 'lucide-react';
import { api } from '@/lib/api';

interface UsageBreakdownItem {
  model: string;
  agentId: string | null;
  _sum: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  };
}

interface DashboardUsageResponse {
  totalTokens: number;
  breakdown: UsageBreakdownItem[];
}

export function MonthlyTokenMeteringCard() {
  const [usageData, setUsageData] = useState<DashboardUsageResponse | null>(null);
  const [agentMap, setAgentMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeteringData();
  }, []);

  async function loadMeteringData() {
    try {
      setLoading(true);
      const [usageRes, agentsRes] = await Promise.all([
        api.get<{ status: string; data: DashboardUsageResponse }>('/api/dashboard/usage'),
        api.get<{ status: string; data: Array<{ id: string; name: string; type?: string }> }>('/api/dashboard/agents').catch(() => ({ data: [] })),
      ]);

      if (usageRes?.data) {
        setUsageData(usageRes.data);
      }

      const map: Record<string, string> = {};
      (agentsRes?.data || []).forEach((a) => {
        map[a.id] = `${a.name} (${a.type || 'general'})`;
      });
      setAgentMap(map);
    } catch {
      // Fallback silently if no usage records yet
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-600" />
            Monthly LLM Token Metering Breakdown (Current Calendar Month)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Live SaaS token ledger from <code className="font-mono text-indigo-600">/api/dashboard/usage</code> grouped by AI model and specialist agent.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 text-xs font-semibold text-indigo-900">
            Month Total: <span className="font-mono font-bold text-indigo-600">{(usageData?.totalTokens || 0).toLocaleString()}</span> tokens
          </div>
          <button
            onClick={loadMeteringData}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Loading monthly token metering breakdown...</div>
      ) : !usageData || usageData.breakdown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
          No metered LLM token usage recorded for the current calendar month yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">LLM Model</th>
                <th className="py-3 px-4">Specialist Agent</th>
                <th className="py-3 px-4">Prompt Tokens</th>
                <th className="py-3 px-4">Completion Tokens</th>
                <th className="py-3 px-4 text-right">Total Metered Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {usageData.breakdown.map((row, idx) => (
                <tr key={`${row.model}-${row.agentId || 'global'}-${idx}`} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-indigo-600">{row.model}</td>
                  <td className="py-3 px-4 font-sans text-slate-800 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    {row.agentId ? agentMap[row.agentId] || row.agentId : 'Orchestrator / Global Flow'}
                  </td>
                  <td className="py-3 px-4">{(row._sum.promptTokens || 0).toLocaleString()}</td>
                  <td className="py-3 px-4">{(row._sum.completionTokens || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {(row._sum.totalTokens || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
