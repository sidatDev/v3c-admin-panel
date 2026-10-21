'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Clock,
  History,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  Tag,
} from 'lucide-react';

interface KbVersionItem {
  versionNumber: number;
  entryId: number;
  title: string;
  content: string;
  authorName: string;
  changeType: 'CREATE' | 'EDIT' | 'ROLLBACK';
  slaTier: string;
  approvalStatus: string;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
}

interface KbGovernedEntry {
  entryId: number;
  title: string;
  content: string;
  enabled: boolean;
  currentVersion: number;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED_ACTIVE' | 'REJECTED' | 'ARCHIVED_EXPIRED';
  metadata: {
    productLine: string;
    department: string;
    language: 'EN' | 'UR' | 'Bilingual';
    effectiveDate: string;
    expiryDate: string | null;
    slaTier: string;
  };
  isExpired: boolean;
  isExpiringWithin7Days: boolean;
  daysUntilExpiry: number | null;
  versions: KbVersionItem[];
  updatedAt: string;
}

export function KbGovernancePanel() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<KbGovernedEntry[]>([]);
  const [summary, setSummary] = useState({
    totalGovernedEntries: 0,
    pendingApprovals: 0,
    expiringWithin7Days: 0,
    expiredArchivedCount: 0,
  });

  // Submission Form State
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [productLine, setProductLine] = useState('Motor & Takaful');
  const [department, setDepartment] = useState('Claims & Policy Servicing');
  const [language, setLanguage] = useState<'EN' | 'UR' | 'Bilingual'>('EN');
  const [slaTier, setSlaTier] = useState<'MINOR_EDIT_24H' | 'NEW_CONTENT_48H' | 'EMERGENCY_COMPLIANCE_4H'>('MINOR_EDIT_24H');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Version History Drawer State
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<KbGovernedEntry | null>(null);

  useEffect(() => {
    loadGovernance();
  }, []);

  async function loadGovernance() {
    try {
      setLoading(true);
      const res: any = await api.get('/api/kb/governance');
      if (res.data) {
        setEntries(res.data.entries || []);
        setSummary(
          res.data.summary || {
            totalGovernedEntries: 0,
            pendingApprovals: 0,
            expiringWithin7Days: 0,
            expiredArchivedCount: 0,
          }
        );
        if (selectedHistoryEntry) {
          const refreshed = (res.data.entries || []).find(
            (e: KbGovernedEntry) => e.entryId === selectedHistoryEntry.entryId
          );
          if (refreshed) setSelectedHistoryEntry(refreshed);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load KB governance state');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitChange(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/api/kb/governance/submit', {
        entryId: editingEntryId || undefined,
        title: title.trim(),
        content: content.trim(),
        productLine,
        department,
        language,
        slaTier,
        expiryDate: expiryDate || null,
        autoApprove: false,
      });
      toast.success(
        editingEntryId
          ? `Submitted new version for Entry #${editingEntryId} (Pending Approval)`
          : 'Submitted new KB content into Pending Approval Queue'
      );
      setEditingEntryId(null);
      setTitle('');
      setContent('');
      setExpiryDate('');
      await loadGovernance();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit KB change');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(entryId: number, decision: 'APPROVE' | 'REJECT') {
    try {
      await api.post(`/api/kb/governance/${entryId}/decision`, {
        decision,
        reviewNotes:
          decision === 'APPROVE'
            ? 'Approved & embedded into active RAG index'
            : 'Rejected during Company Admin review',
      });
      toast.success(
        decision === 'APPROVE'
          ? `Entry #${entryId} approved and activated in RAG!`
          : `Entry #${entryId} rejected`
      );
      await loadGovernance();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process approval decision');
    }
  }

  async function handleRollback(entryId: number, targetVersionNumber: number) {
    try {
      await api.post(`/api/kb/governance/${entryId}/rollback`, { targetVersionNumber });
      toast.success(`1-Click Rollback complete: Entry #${entryId} restored to v${targetVersionNumber}`);
      await loadGovernance();
    } catch (err: any) {
      toast.error(err.message || 'Rollback failed');
    }
  }

  async function handleRunExpirySweep() {
    try {
      const res: any = await api.post('/api/kb/governance/expiry-sweep', {});
      const d = res.data || {};
      toast.success(
        `Expiry Sweep Done: ${d.archivedCount || 0} expired auto-archived, ${d.warnedCount || 0} 7-day warning notifications sent.`
      );
      await loadGovernance();
    } catch (err: any) {
      toast.error(err.message || 'Failed to run expiry sweep');
    }
  }

  async function handleExportKbJson() {
    try {
      const res: any = await api.get('/api/kb/governance/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `v3c-kb-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Full structured KB JSON exported');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export KB JSON');
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              KB Content Approval Workflow, Expiry Tagging &amp; 1-Click Version Rollback
            </h2>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
              Blueprint Sec 5.3 &amp; 5.4
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            All KB additions/edits go through Company Admin approval, carry product/department/expiry metadata tags, and support 1-click version rollback.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunExpirySweep}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition cursor-pointer"
          >
            <Clock className="h-3.5 w-3.5" />
            Run 7-Day Expiry Sweep
          </button>
          <button
            type="button"
            onClick={handleExportKbJson}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Bulk Export JSON
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="text-[11px] font-bold uppercase text-slate-500">Total Governed Articles</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{summary.totalGovernedEntries}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
          <div className="text-[11px] font-bold uppercase text-amber-700">Pending Admin Approval</div>
          <div className="text-xl font-bold text-amber-900 mt-1">{summary.pendingApprovals}</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3.5">
          <div className="text-[11px] font-bold uppercase text-orange-700">Expiring Within 7 Days</div>
          <div className="text-xl font-bold text-orange-900 mt-1">{summary.expiringWithin7Days}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
          <div className="text-[11px] font-bold uppercase text-rose-700">Auto-Archived (Expired)</div>
          <div className="text-xl font-bold text-rose-900 mt-1">{summary.expiredArchivedCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Submit New / Edited KB Article with Metadata & Expiry Tags */}
        <form
          onSubmit={handleSubmitChange}
          className="lg:col-span-1 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-indigo-600" />
              {editingEntryId ? `Submit Edit for Entry #${editingEntryId}` : 'Submit KB Article for Approval'}
            </h3>
            {editingEntryId && (
              <button
                type="button"
                onClick={() => {
                  setEditingEntryId(null);
                  setTitle('');
                  setContent('');
                }}
                className="text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Article / Policy Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Motor Comprehensive Claim SLA 2026"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product Line Tag</label>
              <input
                type="text"
                value={productLine}
                onChange={(e) => setProductLine(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Department Tag</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
              >
                <option value="EN">EN</option>
                <option value="UR">UR</option>
                <option value="Bilingual">Bilingual</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Update SLA</label>
              <select
                value={slaTier}
                onChange={(e) => setSlaTier(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
              >
                <option value="MINOR_EDIT_24H">Minor (24h)</option>
                <option value="NEW_CONTENT_48H">New (48h)</option>
                <option value="EMERGENCY_COMPLIANCE_4H">Emergency (4h)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Knowledge Content</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter verified policy guidelines or bilingual FAQ content..."
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {editingEntryId ? 'Submit New Version for Approval' : 'Submit to Approval Queue'}
          </button>
        </form>

        {/* Right: Governed KB Table + Approval Actions + Version History & Rollback */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Approval Queue &amp; Versioned KB Articles ({entries.length})
              </span>
              <button
                type="button"
                onClick={loadGovernance}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading governed KB entries...</div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No KB entries yet. Submit an article on the left.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Article &amp; Metadata</th>
                      <th className="p-3">Ver</th>
                      <th className="p-3">Approval &amp; Expiry</th>
                      <th className="p-3 text-right">Governance Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((item) => (
                      <tr key={item.entryId} className="hover:bg-slate-50/80">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.metadata.productLine} • {item.metadata.department} • [{item.metadata.language}] •{' '}
                            <span className="font-mono">{item.metadata.slaTier}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-600">v{item.currentVersion}</td>
                        <td className="p-3 space-y-1">
                          {item.approvalStatus === 'APPROVED_ACTIVE' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Approved Active
                            </span>
                          )}
                          {item.approvalStatus === 'PENDING_APPROVAL' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                              <Clock className="h-3 w-3" /> Pending Approval
                            </span>
                          )}
                          {item.approvalStatus === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              <XCircle className="h-3 w-3" /> Rejected
                            </span>
                          )}
                          {item.approvalStatus === 'ARCHIVED_EXPIRED' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              Archived (Expired)
                            </span>
                          )}
                          {item.metadata.expiryDate && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              {item.isExpiringWithin7Days && (
                                <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                              )}
                              Expires: {item.metadata.expiryDate}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {item.approvalStatus === 'PENDING_APPROVAL' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDecision(item.entryId, 'APPROVE')}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecision(item.entryId, 'REJECT')}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEntryId(item.entryId);
                              setTitle(item.title);
                              setContent(item.content);
                              setProductLine(item.metadata.productLine);
                              setDepartment(item.metadata.department);
                              setLanguage(item.metadata.language);
                              setExpiryDate(item.metadata.expiryDate || '');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedHistoryEntry(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                          >
                            <History className="h-3 w-3" /> History ({item.versions.length})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Version History & 1-Click Rollback Drawer */}
          {selectedHistoryEntry && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <History className="h-4 w-4 text-indigo-600" />
                    Version History &amp; 1-Click Rollback — {selectedHistoryEntry.title} (#
                    {selectedHistoryEntry.entryId})
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Click &ldquo;Rollback to this Version&rdquo; on any historical snapshot to restore content and re-index RAG chunks immediately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryEntry(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedHistoryEntry.versions.map((ver) => (
                  <div
                    key={ver.versionNumber}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white p-3 border border-slate-200 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600">v{ver.versionNumber}</span>
                        <span className="font-semibold text-slate-900">{ver.title}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {ver.changeType}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          by {ver.authorName} • {new Date(ver.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{ver.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRollback(selectedHistoryEntry.entryId, ver.versionNumber)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Rollback to v{ver.versionNumber}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
