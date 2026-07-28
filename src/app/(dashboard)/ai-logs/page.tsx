'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
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
  Sliders,
  HelpCircle,
  Download,
  Calendar
} from 'lucide-react';

interface AiLogItem {
  id: string;
  tenantId?: string;
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
  const { user, isAuthenticated, isLoading } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [logs, setLogs] = useState<AiLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('');
  const [fallbackOnly, setFallbackOnly] = useState(false);
  const [search, setSearch] = useState('');

  const [period, setPeriod] = useState<string>('3d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      loadLogs();
    } else if (!isLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, isLoading, modeFilter, fallbackOnly, search, period, startDate, endDate]);

  async function loadLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (modeFilter) params.append('mode', modeFilter);
      if (fallbackOnly) params.append('fallbackTriggered', 'true');
      if (search) params.append('search', search);

      if (period !== 'custom') {
        params.append('period', period);
      } else {
        if (startDate) params.append('startDate', new Date(startDate).toISOString());
        if (endDate) params.append('endDate', new Date(endDate).toISOString());
      }

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
            AI Observability &amp; Telemetry Logs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time audit log of every vector search, RAG retrieval score, model completion, and fallback execution.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 shadow-xs px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Logs
        </button>
      </div>

      {/* Date & Time Range Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Time Range:</span>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {[
              { label: 'Past 24h', value: '24h' },
              { label: 'Past 3 Days', value: '3d' },
              { label: 'Past 7 Days', value: '7d' },
              { label: 'Past 30 Days', value: '30d' },
              { label: 'All Time', value: 'all' },
              { label: 'Custom', value: 'custom' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setPeriod(item.value)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  period === item.value
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Start Date &amp; Time</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-0.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">End Date &amp; Time</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-0.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:outline-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Search & Mode Filters */}
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

        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            checked={fallbackOnly}
            onChange={(e) => setFallbackOnly(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>Fallback Only</span>
          <div className="relative cursor-help" title="Filter logs where the primary AI model failed or triggered human fallback rules">
            <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600 transition" />
          </div>
        </label>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
            Loading AI telemetry records...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No telemetry records found for the selected date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  {isSuperAdmin && <th className="py-3 px-4">Tenant</th>}
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">User Query</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      Prompt / Comp Tokens
                      <div className="relative cursor-help" title="Input prompt tokens / Output completion tokens count reported by LLM API">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600 transition" />
                      </div>
                    </span>
                  </th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Est. Cost</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 font-mono text-slate-700 font-semibold">{log.tenantId || 'system'}</td>
                    )}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        log.mode === 'voice' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {log.mode === 'voice' ? <Zap className="h-3 w-3" /> : <Code className="h-3 w-3" />}
                        {log.mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-900 font-medium" title={log.userQuery}>
                      {log.userQuery || '<No text prompt>'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{log.modelUsed}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-indigo-600 font-bold">{log.promptTokens}</span> / <span className="text-violet-600 font-bold">{log.completionTokens}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{log.latencyMs}ms</td>
                    <td className="py-3 px-4 font-mono text-emerald-600 font-bold">${log.estimatedCost.toFixed(6)}</td>
                    <td className="py-3 px-4">
                      {log.fallbackTriggered ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5" /> Fallback
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                          <CheckCircle className="h-3.5 w-3.5" /> OK
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
