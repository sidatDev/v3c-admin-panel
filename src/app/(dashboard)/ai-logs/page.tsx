'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Code,
  Globe,
  Sliders
} from 'lucide-react';

interface AiLogItem {
  id: string;
  mode: string;
  userQuery: string;
  modelUsed: string;
  voiceUsed: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  estimatedCost: number;
  fallbackTriggered: boolean;
  topicLinksShown: string[];
  avgSimilarityScore: number;
  createdAt: string;
}

export default function AiLogsPage() {
  const [logs, setLogs] = useState<AiLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('');
  const [fallbackOnly, setFallbackOnly] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, [modeFilter, fallbackOnly, search]);

  async function loadLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (modeFilter) params.append('mode', modeFilter);
      if (fallbackOnly) params.append('fallbackTriggered', 'true');
      if (search) params.append('search', search);

      const res: any = await api.get(`/api/ai-logs?${params.toString()}`);
      setLogs(res.data || []);
    } catch (err: any) {
      console.error('Failed to load AI logs:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="h-7 w-7 text-indigo-600" />
            AI Observability & Telemetry Logs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time audit log of every vector search, RAG retrieval score, model completion, and fallback execution.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search query, model name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Modes</option>
          <option value="chat">Text Chat</option>
          <option value="voice">Realtime Voice</option>
        </select>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
          <input
            type="checkbox"
            checked={fallbackOnly}
            onChange={(e) => setFallbackOnly(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-0"
          />
          Fallback Only
        </label>

        <button onClick={loadLogs} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Log Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12 text-indigo-600">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No telemetry records found matching selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5">User Query</th>
                  <th className="p-3.5">Model</th>
                  <th className="p-3.5">Tokens</th>
                  <th className="p-3.5">Latency</th>
                  <th className="p-3.5">Similarity</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="p-3.5 font-semibold capitalize text-indigo-700">
                      {log.mode}
                    </td>
                    <td className="p-3.5 max-w-xs truncate text-slate-900" title={log.userQuery}>
                      {log.userQuery || '(No query recorded)'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{log.modelUsed}</td>
                    <td className="p-3.5 font-mono">
                      {log.promptTokens + log.completionTokens} <span className="text-slate-400">({log.promptTokens} in / {log.completionTokens} out)</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-700">{log.latencyMs} ms</td>
                    <td className="p-3.5 font-mono font-semibold text-slate-900">
                      {log.avgSimilarityScore !== null ? `${(log.avgSimilarityScore * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="p-3.5">
                      {log.fallbackTriggered ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          <AlertTriangle className="h-3 w-3 text-amber-600" /> Topic Fallback
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                          <CheckCircle className="h-3 w-3 text-emerald-600" /> RAG Success
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
