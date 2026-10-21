'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Star,
  BookOpen,
  Building2,
  Download,
  Printer,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface KbGapItem {
  query: string;
  occurrences: number;
  avgSimilarity: number;
  lastSeenAt: string;
}

interface GroupRollupItem {
  tenantId: string;
  companyName: string;
  slug: string;
  totalSessions: number;
  escalationsCount: number;
  avgCsat: number;
  totalMeteredTokens: number;
}

interface CsatAndGapsData {
  csatSummary: {
    totalEvaluations: number;
    avgCustomerSatisfaction: number;
    avgResolutionQuality: number;
    avgAnswerRelevance: number;
    avgOverallScore: number;
    recentFeedback: {
      id: string;
      visitorSessionId: number;
      customerSatisfaction: number;
      feedback: string | null;
      createdAt: string;
    }[];
  };
  kbGaps: KbGapItem[];
  groupRollup: GroupRollupItem[];
}

export function CsatKbGapReportPanel({ period = '30d' }: { period?: string }) {
  const [data, setData] = useState<CsatAndGapsData | null>(null);
  const [kbs, setKbs] = useState<{ id: string; name: string }[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<string>('');
  const [resolvingQuery, setResolvingQuery] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState<string>('');
  const [savingToKb, setSavingToKb] = useState(false);

  useEffect(() => {
    loadData();
    loadKbs();
  }, [period]);

  async function loadData() {
    try {
      const res: any = await api.get(`/api/analytics/csat-and-gaps?period=${period}`);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load CSAT & KB gaps:', err);
    }
  }

  async function loadKbs() {
    try {
      const res: any = await api.get('/api/dashboard/knowledge-bases');
      const list = res?.data || [];
      setKbs(list);
      if (list.length > 0 && !selectedKbId) {
        setSelectedKbId(list[0].id);
      }
    } catch (_) {}
  }

  async function handleSaveGapToKb(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvingQuery || !answerDraft.trim() || !selectedKbId) return;
    try {
      setSavingToKb(true);
      const docContent = `Q: ${resolvingQuery}\nA: ${answerDraft.trim()}`;
      const docRes: any = await api.post(
        `/api/dashboard/knowledge-bases/${selectedKbId}/documents`,
        {
          type: 'text',
          source: docContent,
        }
      );
      if (docRes?.data?.id) {
        await api.post(
          `/api/dashboard/knowledge-bases/${selectedKbId}/documents/${docRes.data.id}/process`,
          {}
        );
      }
      toast.success('KB Gap resolved and indexed into Knowledge Base!');
      setResolvingQuery(null);
      setAnswerDraft('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add answer to Knowledge Base');
    } finally {
      setSavingToKb(false);
    }
  }

  function handleExportCsvReport() {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    window.open(`${baseUrl}/api/analytics/export-report?period=${period}`, '_blank');
  }

  function handlePrintPdfReport() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  const csat = data?.csatSummary;

  return (
    <div className="space-y-6">
      {/* 1. CSAT & Quality Scorecard + Executive Report Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
              <h3 className="text-base font-bold text-slate-900">
                Phase 7: CSAT Quality Scorecard, KB Gap Learning Loop &amp; Multi-Tier Reports
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Customer satisfaction metrics, automated unanswered query detection, and anonymized Group-level company rollups.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsvReport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              <Download className="h-3.5 w-3.5" />
              Export Executive CSV
            </button>
            <button
              type="button"
              onClick={handlePrintPdfReport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* CSAT Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <span className="text-[10px] font-bold uppercase text-amber-700">Avg CSAT Rating</span>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 font-mono">
              {csat?.avgCustomerSatisfaction || 0} <span className="text-sm text-amber-500">/ 5 ★</span>
            </p>
            <span className="text-[11px] text-slate-500">
              Across {csat?.totalEvaluations || 0} rated sessions
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-[10px] font-bold uppercase text-slate-500">Resolution Quality</span>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 font-mono">
              {csat?.avgResolutionQuality || 0} <span className="text-xs text-slate-400">/ 5.0</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-[10px] font-bold uppercase text-slate-500">Answer Relevance</span>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 font-mono">
              {csat?.avgAnswerRelevance || 0} <span className="text-xs text-slate-400">/ 5.0</span>
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <span className="text-[10px] font-bold uppercase text-emerald-700">Overall AI Quality Index</span>
            <p className="mt-1 text-2xl font-extrabold text-emerald-800 font-mono">
              {csat?.avgOverallScore || 0} <span className="text-xs text-emerald-600">/ 5.0</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. KB Gap Detection (Learning Loop) + Group-Level Company Rollup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KB Gap Detection Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">
                KB Gap Detection (Unanswered Queries Learning Loop)
              </h4>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
              {(data?.kbGaps || []).length} Gaps Detected
            </span>
          </div>

          {data?.kbGaps && data.kbGaps.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data.kbGaps.map((gap, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-semibold text-slate-900 truncate">&ldquo;{gap.query}&rdquo;</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Asked {gap.occurrences}x &bull; Avg Similarity: {gap.avgSimilarity}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResolvingQuery(gap.query);
                      setAnswerDraft('');
                    }}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
                  >
                    <Plus className="h-3 w-3" /> Teach KB
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No unanswered KB gaps detected in this period.
            </div>
          )}

          {resolvingQuery && (
            <form
              onSubmit={handleSaveGapToKb}
              className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 space-y-2.5"
            >
              <div className="text-xs font-bold text-indigo-950">
                Add Official Answer for: &ldquo;{resolvingQuery}&rdquo;
              </div>
              {kbs.length > 0 && (
                <select
                  value={selectedKbId}
                  onChange={(e) => setSelectedKbId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {kbs.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      Target KB: {kb.name}
                    </option>
                  ))}
                </select>
              )}
              <textarea
                rows={2}
                value={answerDraft}
                onChange={(e) => setAnswerDraft(e.target.value)}
                placeholder="Write the authoritative answer to index into your Knowledge Base..."
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingQuery(null)}
                  className="text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingToKb || !answerDraft.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingToKb ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Save &amp; Embed to KB
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Group-Level Multi-Company Rollup */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Group-Level Company Rollup (Aggregates Only — Privacy Safe)
            </h4>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Sessions</th>
                  <th className="py-2.5 px-3">Escalations</th>
                  <th className="py-2.5 px-3">Avg CSAT</th>
                  <th className="py-2.5 px-3 text-right">Metered Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {(data?.groupRollup || []).map((row) => (
                  <tr key={row.tenantId}>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                      {row.companyName}
                    </td>
                    <td className="py-2.5 px-3">{row.totalSessions}</td>
                    <td className="py-2.5 px-3">{row.escalationsCount}</td>
                    <td className="py-2.5 px-3 text-amber-600 font-bold">
                      {row.avgCsat > 0 ? `${row.avgCsat} ★` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-indigo-600 font-bold">
                      {row.totalMeteredTokens.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
