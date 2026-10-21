'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Share2,
  Smartphone,
  MessageCircle,
  Send,
  Globe,
  CheckCircle2,
  Settings2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';

type OmnichannelType = 'instagram' | 'messenger' | 'sdk';
type RegionalLanguageCode = 'en' | 'ur' | 'roman_ur' | 'pa' | 'sd' | 'ps';

interface OmnichannelAdapterConfig {
  channel: OmnichannelType;
  label: string;
  enabled: boolean;
  pageOrAccountId: string;
  verifyToken: string;
  appSecretMasked: string;
  webhookEndpoint: string;
  regionalLanguages: RegionalLanguageCode[];
  rateLimitPerMin: number;
  totalMessagesProcessed: number;
  lastInboundAt?: string;
}

interface InboundSimulationResponse {
  channel: OmnichannelType;
  signatureVerified: boolean;
  detectedRegionalLanguage: RegionalLanguageCode;
  normalizedMessage: {
    messageId: string;
    channel: string;
    sessionId: string;
    language: string;
    content: string;
  };
  orchestratorDecision: {
    inScope: boolean;
    intent: string;
    specialistAgent: string;
  };
  outboundEnvelope: Record<string, any>;
}

const LANGUAGE_LABELS: Record<RegionalLanguageCode, string> = {
  en: 'English',
  ur: 'Urdu (اردو)',
  roman_ur: 'Roman Urdu',
  pa: 'Punjabi (پنجابی)',
  sd: 'Sindhi (سنڌي)',
  ps: 'Pashto (پښتو)',
};

export function OmnichannelAdaptersPanel() {
  const queryClient = useQueryClient();
  const [simChannel, setSimChannel] = useState<OmnichannelType>('instagram');
  const [simSender, setSimSender] = useState('ig_user_7721');
  const [simText, setSimText] = useState(
    'Assalam o Alaikum, mujhe AI voice aur WhatsApp automation ki pricing chahiye'
  );
  const [lastResult, setLastResult] = useState<InboundSimulationResponse | null>(null);
  const [editingCfg, setEditingCfg] = useState<OmnichannelAdapterConfig | null>(null);
  const [editPageId, setEditPageId] = useState('');
  const [editVerifyToken, setEditVerifyToken] = useState('');
  const [editRateLimit, setEditRateLimit] = useState(120);

  const { data: channels = [], isLoading } = useQuery<OmnichannelAdapterConfig[]>({
    queryKey: ['omnichannel-adapters'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: OmnichannelAdapterConfig[] }>(
        '/api/integrations/omnichannel'
      );
      return res.data;
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (payload: {
      channel: OmnichannelType;
      enabled?: boolean;
      pageOrAccountId?: string;
      verifyToken?: string;
      rateLimitPerMin?: number;
    }) => {
      return api.post(`/api/integrations/omnichannel/${payload.channel}/config`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omnichannel-adapters'] });
      toast.success('Omnichannel adapter configuration updated');
      setEditingCfg(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update channel config');
    },
  });

  const simulateInboundMutation = useMutation({
    mutationFn: async (payload: {
      channel: OmnichannelType;
      senderId: string;
      text: string;
    }) => {
      return api.post<{ status: string; data: InboundSimulationResponse }>(
        `/api/integrations/omnichannel/${payload.channel}/inbound`,
        {
          senderId: payload.senderId,
          senderName: 'Omnichannel Test User',
          text: payload.text,
        }
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['omnichannel-adapters'] });
      setLastResult(res.data);
      toast.success(
        `Normalized (${res.data.detectedRegionalLanguage.toUpperCase()}) -> Routed to ${res.data.orchestratorDecision.specialistAgent}`
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Simulation failed');
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs text-slate-400">Loading Omnichannel Reach Add-Ons...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-fuchsia-100 bg-gradient-to-br from-white via-fuchsia-50/20 to-indigo-50/20 p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-fuchsia-600" />
            <h2 className="text-base font-bold text-slate-900">
              Omnichannel Reach Add-Ons: Instagram, Messenger & Mobile SDK (Phase 10)
            </h2>
            <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-[10px] font-bold text-fuchsia-700">
              6 Regional Languages
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified Channel Gateway adapters with Meta X-Hub-Signature-256 verification, V3CMessage normalization, and regional language detection (EN, Urdu, Roman Urdu, Punjabi, Sindhi, Pashto).
          </p>
        </div>
      </div>

      {/* 3 Channel Adapter Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {channels.map((cfg) => (
          <div
            key={cfg.channel}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {cfg.channel === 'sdk' ? (
                    <Smartphone className="h-4 w-4 text-indigo-600 shrink-0" />
                  ) : (
                    <MessageCircle className="h-4 w-4 text-fuchsia-600 shrink-0" />
                  )}
                  <h3 className="text-xs font-bold text-slate-900">{cfg.label}</h3>
                </div>
                <button
                  onClick={() =>
                    updateConfigMutation.mutate({
                      channel: cfg.channel,
                      enabled: !cfg.enabled,
                    })
                  }
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    cfg.enabled
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {cfg.enabled ? 'Active' : 'Disabled'}
                </button>
              </div>

              <div className="rounded-lg bg-slate-50 p-2 text-[11px] font-mono text-slate-700 space-y-1 border border-slate-100">
                <div className="truncate">
                  <span className="text-slate-400">Account/App ID:</span> {cfg.pageOrAccountId}
                </div>
                <div className="truncate">
                  <span className="text-slate-400">Webhook:</span> {cfg.webhookEndpoint}
                </div>
                <div>
                  <span className="text-slate-400">Rate Limit:</span> {cfg.rateLimitPerMin} msg/min
                </div>
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {cfg.regionalLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 rounded bg-fuchsia-50 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-700 border border-fuchsia-100"
                  >
                    <Globe className="h-2.5 w-2.5" />
                    {LANGUAGE_LABELS[lang] || lang}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
              <span className="font-semibold text-slate-500">
                Processed: <strong>{cfg.totalMessagesProcessed}</strong> msgs
              </span>
              <button
                onClick={() => {
                  setEditingCfg(cfg);
                  setEditPageId(cfg.pageOrAccountId);
                  setEditVerifyToken(cfg.verifyToken);
                  setEditRateLimit(cfg.rateLimitPerMin);
                }}
                className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
              >
                <Settings2 className="h-3 w-3" /> Configure
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Omnichannel Live Simulator */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Omnichannel Gateway & Regional Language Simulator
            </h3>
            <p className="text-[11px] text-slate-500">
              Test inbound message normalization, regional language detection, and Meta Graph API / Mobile SDK reply formatting.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          <select
            value={simChannel}
            onChange={(e) => setSimChannel(e.target.value as OmnichannelType)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 font-semibold"
          >
            <option value="instagram">Instagram Direct</option>
            <option value="messenger">Facebook Messenger</option>
            <option value="sdk">Mobile App SDK</option>
          </select>

          <input
            type="text"
            value={simSender}
            onChange={(e) => setSimSender(e.target.value)}
            placeholder="Sender ID (e.g. ig_user_99)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 font-mono"
          />

          <input
            type="text"
            value={simText}
            onChange={(e) => setSimText(e.target.value)}
            placeholder="Type message in English, Urdu, Roman Urdu, Punjabi, Sindhi or Pashto..."
            className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
          />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <button
              onClick={() =>
                setSimText('Assalam o Alaikum, mujhe AI voice aur WhatsApp automation ki pricing chahiye')
              }
              className="rounded bg-slate-100 px-2 py-1 text-slate-600 hover:bg-slate-200"
            >
              Sample: Roman Urdu Sales
            </button>
            <button
              onClick={() => setSimText('تسی سافٹ ویئر ڈویلپمنٹ دی سروس دیندے او؟')}
              className="rounded bg-slate-100 px-2 py-1 text-slate-600 hover:bg-slate-200"
            >
              Sample: Punjabi Inquiry
            </button>
            <button
              onClick={() => setSimText('Pakistan ka cricket match kab hai?')}
              className="rounded bg-slate-100 px-2 py-1 text-slate-600 hover:bg-slate-200"
            >
              Sample: Out-of-Scope Guardrail
            </button>
          </div>

          <button
            onClick={() =>
              simulateInboundMutation.mutate({
                channel: simChannel,
                senderId: simSender,
                text: simText,
              })
            }
            disabled={simulateInboundMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-fuchsia-500 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Simulate Inbound & Inspect Envelope
          </button>
        </div>

        {lastResult && (
          <div className="rounded-lg border border-fuchsia-100 bg-fuchsia-50/40 p-3 text-xs space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Channel: {lastResult.channel.toUpperCase()}</span>
              <span>•</span>
              <span>Detected Language: {LANGUAGE_LABELS[lastResult.detectedRegionalLanguage]}</span>
              <span>•</span>
              <span>Intent: {lastResult.orchestratorDecision.intent.toUpperCase()}</span>
              <span>•</span>
              <span className="text-indigo-700">
                Agent: {lastResult.orchestratorDecision.specialistAgent}
              </span>
            </div>
            <pre className="overflow-x-auto rounded bg-slate-900 p-2.5 text-[10px] text-emerald-300 font-mono">
              {JSON.stringify(lastResult.outboundEnvelope, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Configure Modal */}
      {editingCfg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <h3 className="text-base font-bold text-slate-900">Configure {editingCfg.label}</h3>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Meta Page / IG Business Account / SDK App ID
              </label>
              <input
                type="text"
                value={editPageId}
                onChange={(e) => setEditPageId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Webhook Verify Token / SDK Signing Key
              </label>
              <input
                type="text"
                value={editVerifyToken}
                onChange={(e) => setEditVerifyToken(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Rate Limit (Messages / Min)
              </label>
              <input
                type="number"
                value={editRateLimit}
                onChange={(e) => setEditRateLimit(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingCfg(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateConfigMutation.mutate({
                    channel: editingCfg.channel,
                    pageOrAccountId: editPageId,
                    verifyToken: editVerifyToken,
                    rateLimitPerMin: editRateLimit,
                  })
                }
                className="rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-bold text-white hover:bg-fuchsia-500"
              >
                Save Adapter Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
