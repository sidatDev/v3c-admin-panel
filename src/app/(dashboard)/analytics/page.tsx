'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import {
  BarChart3,
  MessageSquare,
  Mic,
  DollarSign,
  Clock,
  AlertTriangle,
  Cpu,
  RefreshCw,
  TrendingUp,
  HelpCircle,
  Download,
  Calendar,
  Layers,
  Zap,
  ShieldAlert,
  Building2,
  PieChart
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';

interface ModelBreakdownItem {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  count: number;
}

interface TimeseriesItem {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  requests: number;
}

interface OverviewStats {
  totalSessions: number;
  chatSessions: number;
  voiceSessions: number;
  fallbackRate: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  modelBreakdown: ModelBreakdownItem[];
  timeseriesData: TimeseriesItem[];
}

interface TopQuestion {
  query: string;
  count: number;
  fallbackCount: number;
}

interface AgentStat {
  id: string;
  name: string;
  voice: string;
  isActive: boolean;
  sessionCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  totalCost: number;
}

interface TenantUsageItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  sessionCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: number;
  quotaLimit: number;
  quotaPercentage: number;
}

export default function AnalyticsPage() {
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [period, setPeriod] = useState<string>('3d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');

  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [tenantLeaderboard, setTenantLeaderboard] = useState<TenantUsageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      loadAnalytics();
    } else if (!isLoadingAuth && !isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, isLoadingAuth, period, startDate, endDate, selectedTenantId]);

  async function loadAnalytics() {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (period !== 'custom') {
        params.append('period', period);
      } else {
        if (startDate) params.append('startDate', new Date(startDate).toISOString());
        if (endDate) params.append('endDate', new Date(endDate).toISOString());
      }

      if (isSuperAdmin && selectedTenantId) {
        params.append('tenantId', selectedTenantId);
      }

      const queryString = params.toString();

      const promises: Promise<any>[] = [
        api.get(`/api/analytics/overview?${queryString}`),
        api.get(`/api/analytics/top-questions?${queryString}`),
        api.get(`/api/analytics/agents?${queryString}`)
      ];

      if (isSuperAdmin) {
        promises.push(api.get(`/api/super-admin/tenants-usage?${queryString}`));
      }

      const results = await Promise.all(promises);

      setOverview(results[0].data);
      setTopQuestions(results[1].data || []);
      setAgentStats(results[2].data || []);

      if (isSuperAdmin && results[3]) {
        setTenantLeaderboard(results[3].data || []);
      }
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCsv() {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (period !== 'custom') params.append('period', period);
      else {
        if (startDate) params.append('startDate', new Date(startDate).toISOString());
        if (endDate) params.append('endDate', new Date(endDate).toISOString());
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/super-admin/export-usage?${params.toString()}`, {
        credentials: 'include'
      });
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `v3c-usage-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error('CSV Export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  if (loading && !overview) {
    return (
      <div className="flex h-96 items-center justify-center text-indigo-600">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-600" />
            {isSuperAdmin ? 'Platform Operator AI Telemetry & Cost Analytics' : 'Enterprise AI Analytics & Insights'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSuperAdmin
              ? 'Global multi-tenant token consumption, API cost accounting, model metrics, and tenant leaderboard.'
              : 'Performance metrics across voice vs text channels, token cost breakdown, fallback rates, and top user trends.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {exporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export Usage CSV
            </button>
          )}

          <button
            onClick={loadAnalytics}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 shadow-xs px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Period + Custom Date-Time Picker + Tenant Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Time Filter:</span>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {[
              { label: 'Past 24h', value: '24h' },
              { label: 'Past 3 Days', value: '3d' },
              { label: 'Past 7 Days', value: '7d' },
              { label: 'Past 30 Days', value: '30d' },
              { label: 'All Time', value: 'all' },
              { label: 'Custom Range', value: 'custom' },
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

        {/* Custom Date-Time Inputs */}
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

        {/* Super Admin Tenant Filter */}
        {isSuperAdmin && tenantLeaderboard.length > 0 && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Tenant Filter:</span>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-indigo-500"
            >
              <option value="all">⚡ All Tenants (Global Platform)</option>
              {tenantLeaderboard.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Metric Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Input Tokens */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs relative group">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                Input Tokens
                <div className="relative cursor-help" title="Total prompt tokens sent to LLMs during context retrieval and prompt construction">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                </div>
              </span>
              <Cpu className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {(overview.promptTokens || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500">
              Prompt &amp; context embeddings
            </p>
          </div>

          {/* Card 2: Output Tokens */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs relative group">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                Output Tokens
                <div className="relative cursor-help" title="Total completion tokens generated by AI responses and voice synthesis">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                </div>
              </span>
              <Zap className="h-4 w-4 text-violet-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {(overview.completionTokens || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500">
              Generated answer completion tokens
            </p>
          </div>

          {/* Card 3: Total Tokens */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs relative group">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                Total Token Volume
                <div className="relative cursor-help" title="Combined volume of input (prompt) + output (completion) tokens across selected period">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                </div>
              </span>
              <Layers className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {(overview.totalTokens || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500">
              Across {overview.totalSessions} visitor sessions
            </p>
          </div>

          {/* Card 4: Total API Cost */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs relative group">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                Calculated API Cost
                <div className="relative cursor-help" title="Calculated model API cost based on official input ($0.15/1M) and output ($0.60/1M) rates">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                </div>
              </span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              ${(overview.totalCost || 0).toFixed(6)} <span className="text-xs font-semibold text-slate-500">USD</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Average latency: {overview.avgLatencyMs}ms
            </p>
          </div>
        </div>
      )}

      {/* Interactive Token Trend Chart */}
      {overview && overview.timeseriesData && overview.timeseriesData.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              Token Usage &amp; Cost Volume Over Time
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 inline-block" />
                Input Tokens
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500 inline-block" />
                Output Tokens
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.timeseriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="inputTokens" stroke="#6366f1" fillOpacity={1} fill="url(#colorInput)" name="Input Tokens" />
                <Area type="monotone" dataKey="outputTokens" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorOutput)" name="Output Tokens" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Super Admin Tenant Leaderboard Table */}
      {isSuperAdmin && tenantLeaderboard.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Tenant Cost &amp; Token Leaderboard (Platform Overview)
              <div className="relative cursor-help" title="Ranked leaderboard of all tenant workspaces displaying their total session volume, input/output tokens, API cost, and monthly quota progress">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600 transition" />
              </div>
            </h3>
            <span className="text-xs font-medium text-slate-500">{tenantLeaderboard.length} Active Tenants</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Tenant Name</th>
                  <th className="py-3 px-4">Sessions</th>
                  <th className="py-3 px-4">Input Tokens</th>
                  <th className="py-3 px-4">Output Tokens</th>
                  <th className="py-3 px-4">Total Tokens</th>
                  <th className="py-3 px-4">Calculated Cost</th>
                  <th className="py-3 px-4">Quota Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenantLeaderboard.map((tenant, idx) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{tenant.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{tenant.slug}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{tenant.sessionCount}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{tenant.promptTokens.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{tenant.completionTokens.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{tenant.totalTokens.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600">${tenant.totalCost.toFixed(6)}</td>
                    <td className="py-3 px-4">
                      <div className="w-32">
                        <div className="flex justify-between text-[10px] mb-1 font-semibold text-slate-500">
                          <span>{tenant.quotaPercentage}%</span>
                          <span>{tenant.sessionCount}/{tenant.quotaLimit}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              tenant.quotaPercentage >= 90 ? 'bg-red-500' : tenant.quotaPercentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${tenant.quotaPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model Breakdown & Top Questions Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Model Breakdown Card */}
        {overview && overview.modelBreakdown && overview.modelBreakdown.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-indigo-600" />
                Per-Model Token &amp; Cost Distribution
              </span>
              <div className="relative cursor-help" title="Breakdown of token consumption, cost, and request count per underlying AI Model">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600 transition" />
              </div>
            </h3>

            <div className="space-y-3">
              {overview.modelBreakdown.map((m) => (
                <div key={m.model} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block font-mono">{m.model}</span>
                    <span className="text-[10px] text-slate-500">{m.count} completions</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-indigo-600 font-mono block">{m.totalTokens.toLocaleString()} tokens</span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">${m.cost.toFixed(6)} USD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent Performance Table */}
        {agentStats.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-600" />
                Agent Usage &amp; Latency Summary
              </span>
              <div className="relative cursor-help" title="Performance metrics and token consumption for each AI Agent configured in your workspace">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600 transition" />
              </div>
            </h3>

            <div className="space-y-3">
              {agentStats.map((agent) => (
                <div key={agent.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{agent.name}</span>
                    <span className="text-[10px] text-slate-500">Latency: {agent.avgLatencyMs}ms</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-indigo-600 font-mono block">{agent.totalTokens.toLocaleString()} tokens</span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">${agent.totalCost.toFixed(6)} USD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
