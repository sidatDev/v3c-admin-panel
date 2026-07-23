'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
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
  HelpCircle
} from 'lucide-react';

interface OverviewStats {
  totalSessions: number;
  chatSessions: number;
  voiceSessions: number;
  fallbackRate: number;
  totalCost: number;
  avgLatencyMs: number;
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
  avgLatencyMs: number;
  totalCost: number;
  totalTokens: number;
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const [overviewRes, questionsRes, agentsRes]: [any, any, any] = await Promise.all([
        api.get('/api/analytics/overview'),
        api.get('/api/analytics/top-questions'),
        api.get('/api/analytics/agents')
      ]);

      setOverview(overviewRes.data);
      setTopQuestions(questionsRes.data || []);
      setAgentStats(agentsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-indigo-600">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-600" />
            Enterprise AI Analytics & Insights
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Performance metrics across voice vs text channels, token cost breakdown, fallback rates, and top user intent trends.
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 shadow-xs px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
        </button>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Conversations</span>
              <MessageSquare className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{overview.totalSessions}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-1">
              <span>Chat: {overview.chatSessions}</span>
              <span>&bull;</span>
              <span>Voice: {overview.voiceSessions}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Fallback Rate</span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-600">{overview.fallbackRate}%</div>
            <div className="text-[11px] text-slate-500">
              Queries outside KB similarity threshold
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Est. AI Cost</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">${overview.totalCost.toFixed(4)}</div>
            <div className="text-[11px] text-slate-500">Calculated from prompt & output tokens</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Avg Latency</span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{overview.avgLatencyMs} ms</div>
            <div className="text-[11px] text-slate-500">Average vector search + LLM completion</div>
          </div>
        </div>
      )}

      {/* Grid: Top Questions & Per-Agent Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Questions Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-indigo-600" />
              Top Asked User Questions
            </h3>
            <span className="text-xs text-slate-500">Frequency</span>
          </div>

          <div className="space-y-2">
            {topQuestions.length > 0 ? (
              topQuestions.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="font-medium text-slate-900 truncate max-w-[280px]" title={q.query}>
                    {q.query}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    {q.fallbackCount > 0 && (
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                        {q.fallbackCount} fallback
                      </span>
                    )}
                    <span className="font-semibold text-indigo-600">{q.count} turns</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">No question data collected yet.</div>
            )}
          </div>
        </div>

        {/* Per-Agent Stats Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-600" />
              Per-Agent Performance Breakdown
            </h3>
          </div>

          <div className="space-y-2">
            {agentStats.length > 0 ? (
              agentStats.map((ag) => (
                <div key={ag.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{ag.name}</span>
                    <span className="text-slate-500">Voice: {ag.voice}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1.5 border-t border-slate-200">
                    <div>Sessions: <span className="text-slate-900 font-semibold">{ag.sessionCount}</span></div>
                    <div>Avg Latency: <span className="text-slate-900 font-semibold">{ag.avgLatencyMs} ms</span></div>
                    <div>Cost: <span className="text-emerald-700 font-semibold">${ag.totalCost.toFixed(4)}</span></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">No agent performance metrics found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
