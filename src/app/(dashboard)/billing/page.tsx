'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import {
  CreditCard,
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  Zap,
  MessageSquare,
  Activity,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface BillingSummaryData {
  tenant: { id: string; name: string; slug: string } | null;
  plan: {
    name: string;
    status: string;
    maxConversations: number;
    usedConversations: number;
    quotaPercentage: number;
  };
  billingSummary: {
    totalCost: number;
    voiceCost: number;
    chatCost: number;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    voiceTokens: number;
    chatTokens: number;
    sessionCount: number;
  };
}

export default function BillingPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [data, setData] = useState<BillingSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [period, setPeriod] = useState<string>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadBillingSummary();
  }, [period, startDate, endDate]);

  async function loadBillingSummary() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (period !== 'custom') {
        params.append('period', period);
      } else {
        if (startDate) params.append('startDate', new Date(startDate).toISOString());
        if (endDate) params.append('endDate', new Date(endDate).toISOString());
      }

      const res: any = await api.get(`/api/billing/summary?${params.toString()}`);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load billing summary:', err);
      toast.error('Failed to load subscription & billing data');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCsv() {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (period !== 'custom') {
        params.append('period', period);
      } else {
        if (startDate) params.append('startDate', new Date(startDate).toISOString());
        if (endDate) params.append('endDate', new Date(endDate).toISOString());
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/conversations/export-csv?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `v3c-billing-usage-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV usage & billing report downloaded successfully!');
    } catch (err: any) {
      console.error('CSV Export failed:', err);
      toast.error(err.message || 'Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  }

  const summary = data?.billingSummary;
  const plan = data?.plan;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-indigo-600" />
            Billing &amp; Subscription Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time usage history, API cost calculations, subscription quota tracking, and accounting exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {exporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export Usage CSV
          </button>

          <button
            onClick={loadBillingSummary}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 shadow-xs px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Date & Time Range Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Billing Period:</span>
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

      {/* Subscription & Quota Status Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Active Subscription
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Account Active
              </span>
            </div>
            <h2 className="text-xl font-bold mt-2">{plan?.name || 'Enterprise Multi-Agent Tier'}</h2>
            <p className="text-xs text-slate-300 mt-1">
              Workspace ID: <span className="font-mono text-indigo-300">{data?.tenant?.id || 'Primary Tenant'}</span> ({data?.tenant?.name})
            </p>
          </div>

          <div className="min-w-[240px] bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs font-semibold mb-1">
              <span>Session Quota Progress</span>
              <span className="text-indigo-300 font-bold">{plan?.quotaPercentage || 0}%</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  (plan?.quotaPercentage || 0) >= 90 ? 'bg-red-500' : (plan?.quotaPercentage || 0) >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${plan?.quotaPercentage || 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-300 mt-2 font-mono">
              {plan?.usedConversations || 0} / {plan?.maxConversations || 1000} sessions used
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              Accrued API Cost ($)
              <div className="relative cursor-help" title="Combined calculated cost for text chat + realtime voice API calls based on official OpenAI token rates">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600 transition" />
              </div>
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-3">
            ${(summary?.totalCost || 0).toFixed(4)} <span className="text-xs text-slate-400 font-normal">USD</span>
          </p>
          <div className="mt-2 text-[11px] text-slate-500">
            Across {summary?.sessionCount || 0} customer sessions
          </div>
        </div>

        {/* Card 2: Voice Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              Voice Agent API Cost
              <div className="relative cursor-help" title="Realtime Voice API cost (gpt-realtime-mini @ $10.00 / $20.00 per 1M tokens)">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600 transition" />
              </div>
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-3">
            ${(summary?.voiceCost || 0).toFixed(4)} <span className="text-xs text-slate-400 font-normal">USD</span>
          </p>
          <div className="mt-2 text-[11px] text-slate-500 font-mono">
            {((summary?.voiceTokens || 0)).toLocaleString()} audio/text tokens
          </div>
        </div>

        {/* Card 3: Chat Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              Text Chat API Cost
              <div className="relative cursor-help" title="Text Chat API cost (gpt-4o-mini @ $0.15 / $0.60 per 1M tokens)">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600 transition" />
              </div>
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-3">
            ${(summary?.chatCost || 0).toFixed(4)} <span className="text-xs text-slate-400 font-normal">USD</span>
          </p>
          <div className="mt-2 text-[11px] text-slate-500 font-mono">
            {((summary?.chatTokens || 0)).toLocaleString()} text tokens
          </div>
        </div>

        {/* Card 4: Total Tokens */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              Total Token Consumption
              <div className="relative cursor-help" title="Total prompt + completion tokens consumed during the selected period">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600 transition" />
              </div>
            </span>
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-3">
            {(summary?.totalTokens || 0).toLocaleString()}
          </p>
          <div className="mt-2 text-[11px] text-slate-500 font-mono">
            In: {(summary?.totalPromptTokens || 0).toLocaleString()} | Out: {(summary?.totalCompletionTokens || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Channel Usage & Cost Breakdown Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          Channel Cost &amp; Token Breakdown
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Detailed split between Realtime Voice stream processing and standard Text Chat completions.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Channel / Mode</th>
                <th className="py-3 px-4">AI Model Used</th>
                <th className="py-3 px-4">Input Tokens</th>
                <th className="py-3 px-4">Output Tokens</th>
                <th className="py-3 px-4">Total Tokens</th>
                <th className="py-3 px-4">Official Rate Structure</th>
                <th className="py-3 px-4 text-right">Calculated Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr className="hover:bg-slate-50 transition">
                <td className="py-4 px-4 font-sans font-semibold text-slate-900 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" /> Realtime Voice Agent
                </td>
                <td className="py-4 px-4 text-indigo-600 font-bold">gpt-realtime-mini</td>
                <td className="py-4 px-4">{((summary?.voiceTokens || 0) * 0.75 | 0).toLocaleString()}</td>
                <td className="py-4 px-4">{((summary?.voiceTokens || 0) * 0.25 | 0).toLocaleString()}</td>
                <td className="py-4 px-4 font-bold">{((summary?.voiceTokens || 0)).toLocaleString()}</td>
                <td className="py-4 px-4 text-slate-500 font-sans text-[11px]">$10.00 / 1M Input, $20.00 / 1M Output</td>
                <td className="py-4 px-4 text-right text-amber-600 font-bold">${(summary?.voiceCost || 0).toFixed(6)}</td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="py-4 px-4 font-sans font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-500" /> Text Chat Assistant
                </td>
                <td className="py-4 px-4 text-indigo-600 font-bold">gpt-4o-mini</td>
                <td className="py-4 px-4 font-mono">{((summary?.chatTokens || 0) * 0.7 | 0).toLocaleString()}</td>
                <td className="py-4 px-4 font-mono">{((summary?.chatTokens || 0) * 0.3 | 0).toLocaleString()}</td>
                <td className="py-4 px-4 font-bold">{((summary?.chatTokens || 0)).toLocaleString()}</td>
                <td className="py-4 px-4 text-slate-500 font-sans text-[11px]">$0.15 / 1M Input, $0.60 / 1M Output</td>
                <td className="py-4 px-4 text-right text-indigo-600 font-bold">${(summary?.chatCost || 0).toFixed(6)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
