'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  PhoneOutgoing,
  Upload,
  ShieldBan,
  Play,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  PhoneOff,
  RefreshCw,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface DncEntry {
  phone: string;
  source: 'verbal' | 'dtmf' | 'manual';
  reason: string;
  addedAt: string;
}

interface CampaignContact {
  id: string;
  name: string;
  rawPhone: string;
  e164Phone: string;
  segment?: string;
  disposition: string;
  attempts: number;
  lastDialedAt?: string;
  inCallEvent?: string;
  notes?: string;
}

interface OutboundCampaign {
  id: string;
  name: string;
  type: 'lead_outreach' | 'payment_reminder' | 'csat_followup' | 'renewal_notice';
  voicePersona: 'Alloy' | 'Shimmer' | 'Echo' | 'Urdu-Female-PK';
  callerId: string;
  callingWindow: string;
  concurrencyLimit: number;
  maxRetries: number;
  status: 'scheduled' | 'running' | 'completed' | 'paused';
  scriptPrompt: string;
  ingestionStats: {
    totalUploaded: number;
    validReady: number;
    duplicatesRemoved: number;
    dncScrubbed: number;
    invalidNumbers: number;
  };
  contacts: CampaignContact[];
  updatedAt: string;
}

interface CampaignsPayload {
  campaigns: OutboundCampaign[];
  dncList: DncEntry[];
}

export function OutboundCampaignPanel() {
  const queryClient = useQueryClient();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDncOpen, setIsDncOpen] = useState(false);

  // New Campaign Form
  const [name, setName] = useState('');
  const [type, setType] = useState<OutboundCampaign['type']>('lead_outreach');
  const [voicePersona, setVoicePersona] = useState<OutboundCampaign['voicePersona']>('Urdu-Female-PK');
  const [concurrencyLimit, setConcurrencyLimit] = useState(3);
  const [maxRetries, setMaxRetries] = useState(3);
  const [callingWindow, setCallingWindow] = useState('09:00 - 20:00 PKT');
  const [csvContent, setCsvContent] = useState(
    `Name,Phone,Segment\nAli Hassan,03001234567,Enterprise\nFatima Noor,+923339876543,SMB\nAli Duplicate,03001234567,Enterprise\nDNC Blocked User,03009998888,SMB\nInvalid Phone,12345,Test`
  );

  // New DNC Form
  const [dncPhone, setDncPhone] = useState('');
  const [dncSource, setDncSource] = useState<'manual' | 'verbal' | 'dtmf'>('manual');
  const [dncReason, setDncReason] = useState('');

  const { data, isLoading } = useQuery<CampaignsPayload>({
    queryKey: ['outbound-campaigns'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CampaignsPayload }>('/api/integrations/campaigns');
      return res.data;
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post<{ status: string; data: OutboundCampaign }>('/api/integrations/campaigns', payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['outbound-campaigns'] });
      const s = res.data.ingestionStats;
      toast.success(
        `Campaign created: ${s.validReady} ready, ${s.dncScrubbed} DNC scrubbed, ${s.duplicatesRemoved} dupes, ${s.invalidNumbers} invalid.`
      );
      setIsNewModalOpen(false);
      setName('');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create campaign');
    },
  });

  const dialBatchMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return api.post<{
        status: string;
        data: {
          dialedCount: number;
          remainingQueue: number;
          campaignStatus: string;
        };
      }>(`/api/integrations/campaigns/${campaignId}/dial`, {});
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['outbound-campaigns'] });
      toast.success(
        `Dialer batch completed: ${res.data.dialedCount} calls processed (${res.data.remainingQueue} remaining in queue).`
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Dialer batch failed');
    },
  });

  const addDncMutation = useMutation({
    mutationFn: async (payload: { phone: string; source: 'manual' | 'verbal' | 'dtmf'; reason: string }) => {
      return api.post<{
        status: string;
        data: { entry: DncEntry; scrubbedCampaignContacts: number };
      }>('/api/integrations/campaigns/dnc', payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['outbound-campaigns'] });
      toast.success(
        `Added ${res.data.entry.phone} to DNC Registry (${res.data.scrubbedCampaignContacts} active campaign contacts scrubbed).`
      );
      setDncPhone('');
      setDncReason('');
    },
  });

  const removeDncMutation = useMutation({
    mutationFn: async (phone: string) => {
      return api.delete(`/api/integrations/campaigns/dnc/${encodeURIComponent(phone)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-campaigns'] });
      toast.success('Removed phone from Company DNC Registry');
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs text-slate-400">Loading Outbound Voice Campaign Engine...</p>
      </div>
    );
  }

  const campaigns = data?.campaigns || [];
  const dncList = data?.dncList || [];

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/20 p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <PhoneOutgoing className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Outbound Voice Campaign Engine & Company DNC Scrubbing (Phase 9)
            </h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
              E.164 + SIP Dialer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload CSV contact lists with automatic Pakistan/International E.164 normalization, deduplication, Company DNC scrubbing, concurrency limits, and retry dispositions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDncOpen(!isDncOpen)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            <ShieldBan className="h-3.5 w-3.5" />
            Company DNC ({dncList.length})
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload CSV Campaign
          </button>
        </div>
      </div>

      {/* Collapsible Company DNC Registry */}
      {isDncOpen && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <ShieldBan className="h-4 w-4 text-rose-600" />
                Company Do-Not-Call (DNC) Registry — Verbal, DTMF & Manual Opt-Outs
              </h3>
              <p className="text-[11px] text-rose-700">
                Adding a number immediately scrubs matching queued contacts from all active campaigns.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="03001234567 or +923..."
                value={dncPhone}
                onChange={(e) => setDncPhone(e.target.value)}
                className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs text-slate-900 outline-none"
              />
              <select
                value={dncSource}
                onChange={(e) => setDncSource(e.target.value as any)}
                className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs text-slate-900"
              >
                <option value="manual">Manual Admin</option>
                <option value="verbal">Verbal In-Call</option>
                <option value="dtmf">DTMF Keypress</option>
              </select>
              <input
                type="text"
                placeholder="Reason (optional)"
                value={dncReason}
                onChange={(e) => setDncReason(e.target.value)}
                className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs text-slate-900 outline-none"
              />
              <button
                onClick={() => {
                  if (!dncPhone.trim()) return toast.error('Enter phone number');
                  addDncMutation.mutate({ phone: dncPhone, source: dncSource, reason: dncReason });
                }}
                disabled={addDncMutation.isPending}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-500"
              >
                <Plus className="h-3 w-3" /> Add DNC
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dncList.map((entry) => (
              <div
                key={entry.phone}
                className="flex items-center justify-between rounded-lg border border-rose-200/80 bg-white px-3 py-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">{entry.phone}</span>
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-700">
                      {entry.source}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate max-w-[210px]">{entry.reason}</p>
                </div>
                <button
                  onClick={() => removeDncMutation.mutate(entry.phone)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Remove from DNC"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {campaigns.map((cmp) => {
          const answeredCount = cmp.contacts.filter((c) => c.disposition === 'answered').length;
          const retryCount = cmp.contacts.filter((c) => c.disposition === 'retry_scheduled').length;
          const readyCount = cmp.contacts.filter((c) => c.disposition === 'ready').length;
          const dncCount = cmp.contacts.filter(
            (c) => c.disposition === 'dnc_scrubbed' || c.disposition === 'dnc_requested'
          ).length;
          const humanFollowUpCount = cmp.contacts.filter((c) => c.disposition === 'max_attempts').length;

          return (
            <div
              key={cmp.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">{cmp.name}</h3>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                        {cmp.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Voice: <strong>{cmp.voicePersona}</strong> • Window: <strong>{cmp.callingWindow}</strong> • Concurrency:{' '}
                      <strong>{cmp.concurrencyLimit} ch</strong> • Max Retries: <strong>{cmp.maxRetries}</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => dialBatchMutation.mutate(cmp.id)}
                    disabled={dialBatchMutation.isPending || (readyCount === 0 && retryCount === 0)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-40 shrink-0"
                  >
                    <Play className="h-3 w-3" />
                    Run Dialer Batch ({readyCount + retryCount})
                  </button>
                </div>

                {/* Ingestion & Disposition Metrics */}
                <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <div className="text-xs font-bold text-slate-900">{readyCount}</div>
                    <div className="text-[9px] text-slate-500 uppercase font-semibold">Queued</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                    <div className="text-xs font-bold text-emerald-700">{answeredCount}</div>
                    <div className="text-[9px] text-emerald-600 uppercase font-semibold">Answered</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2 border border-amber-100">
                    <div className="text-xs font-bold text-amber-700">{retryCount}</div>
                    <div className="text-[9px] text-amber-600 uppercase font-semibold">Retries</div>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-2 border border-rose-100">
                    <div className="text-xs font-bold text-rose-700">{dncCount}</div>
                    <div className="text-[9px] text-rose-600 uppercase font-semibold">DNC Blocked</div>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2 border border-indigo-100">
                    <div className="text-xs font-bold text-indigo-700">{humanFollowUpCount}</div>
                    <div className="text-[9px] text-indigo-600 uppercase font-semibold">Human Queue</div>
                  </div>
                </div>

                {/* Contact Disposition Table */}
                <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-100">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold">
                      <tr>
                        <th className="p-2">Contact</th>
                        <th className="p-2">E.164 Phone</th>
                        <th className="p-2">Disposition</th>
                        <th className="p-2">Tries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cmp.contacts.map((c) => (
                        <tr key={c.id} className="border-t border-slate-100">
                          <td className="p-2 font-semibold text-slate-800">{c.name}</td>
                          <td className="p-2 font-mono text-slate-600">{c.e164Phone}</td>
                          <td className="p-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                c.disposition === 'answered'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : c.disposition.includes('dnc') || c.disposition === 'invalid'
                                  ? 'bg-rose-50 text-rose-700'
                                  : c.disposition === 'retry_scheduled'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {c.disposition}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-slate-500">{c.attempts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                <span>
                  CSV Scrub: {cmp.ingestionStats.totalUploaded} rows ({cmp.ingestionStats.duplicatesRemoved} dupes,{' '}
                  {cmp.ingestionStats.dncScrubbed} DNC, {cmp.ingestionStats.invalidNumbers} invalid)
                </span>
                <span className="font-mono text-slate-400">Caller ID: {cmp.callerId}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload CSV Campaign Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              Create Outbound Voice Campaign (CSV E.164 + DNC Scrub)
            </h3>

            <input
              type="text"
              placeholder="Campaign Name (e.g. October Renewal Outbound)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Campaign Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                >
                  <option value="lead_outreach">Lead Outreach</option>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="renewal_notice">Renewal Notice</option>
                  <option value="csat_followup">CSAT Follow-up</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">AI Voice Persona</label>
                <select
                  value={voicePersona}
                  onChange={(e) => setVoicePersona(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                >
                  <option value="Urdu-Female-PK">Urdu-Female-PK</option>
                  <option value="Alloy">Alloy (Neutral)</option>
                  <option value="Shimmer">Shimmer (Warm)</option>
                  <option value="Echo">Echo (Male)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Concurrency</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={concurrencyLimit}
                  onChange={(e) => setConcurrencyLimit(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Max Retries</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Calling Window</label>
                <input
                  type="text"
                  value={callingWindow}
                  onChange={(e) => setCallingWindow(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Contact CSV Rows (Name,Phone,Segment — auto E.164, dedupe & DNC scrub)
              </label>
              <textarea
                rows={5}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!name.trim()) return toast.error('Enter a campaign name');
                  createCampaignMutation.mutate({
                    name,
                    type,
                    voicePersona,
                    concurrencyLimit,
                    maxRetries,
                    callingWindow,
                    csvContent,
                  });
                }}
                disabled={createCampaignMutation.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Validate E.164, Scrub DNC & Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
