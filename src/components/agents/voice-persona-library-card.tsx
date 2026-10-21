'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Volume2,
  Shuffle,
  Play,
  Square,
  Star,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Radio,
  Users,
} from 'lucide-react';

interface VoiceCatalogItem {
  id: string;
  name: string;
  category: string;
  gender: string;
  ageRange: string;
  characteristics: string;
  supportedLanguages: string[];
  defaultSpeed: number;
  defaultWarmth: number;
}

interface VoiceAssignmentConfig {
  mode: 'FIXED' | 'ROTATION_POOL' | 'CHANNEL_SPECIFIC' | 'TIME_OF_DAY' | 'CUSTOMER_SEGMENT';
  fixedVoiceId: string;
  rotationPoolIds: string[];
  rotationCursor: number;
  channelMap: {
    web_voice: string;
    outbound_campaign: string;
    whatsapp_voice: string;
  };
  timeWindowMap: {
    morningVoiceId: string;
    afternoonEveningVoiceId: string;
    afterHoursVoiceId: string;
  };
  segmentMap: {
    premium: string;
    standard: string;
  };
  shortlistedVoiceIds: string[];
  customBrandName: string;
}

interface PreviewPayload {
  voiceId: string;
  personaName: string;
  category: string;
  language: string;
  pace: 'slow' | 'normal' | 'fast';
  durationSeconds: number;
  brandNameInjected: string;
  segments: { stage: string; text: string }[];
  fullScript: string;
  audioPreviewDataUri: string;
}

export function VoicePersonaLibraryCard({
  agentId,
  onUpdated,
}: {
  agentId: string;
  onUpdated?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<VoiceCatalogItem[]>([]);
  const [assignment, setAssignment] = useState<VoiceAssignmentConfig | null>(null);

  // 15-Second Preview Player State
  const [previewVoiceId, setPreviewVoiceId] = useState('shimmer');
  const [previewLanguage, setPreviewLanguage] = useState('English');
  const [previewPace, setPreviewPace] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showShortlistOnly, setShowShortlistOnly] = useState(false);

  // Session Rotation Tester State
  const [lastResolvedSession, setLastResolvedSession] = useState<{
    personaName: string;
    reason: string;
    mode: string;
  } | null>(null);

  useEffect(() => {
    if (agentId) {
      loadVoiceLibrary();
    }
  }, [agentId]);

  async function loadVoiceLibrary() {
    try {
      setLoading(true);
      const res: any = await api.get(`/api/agents/${agentId}/voice-library`);
      if (res.data) {
        setCatalog(res.data.catalog || []);
        setAssignment(res.data.assignment);
        setPreviewVoiceId(res.data.assignment?.fixedVoiceId || 'shimmer');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load V3C Voice Library');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAssignment() {
    if (!assignment) return;
    try {
      setSaving(true);
      const res: any = await api.put(`/api/agents/${agentId}/voice-library`, assignment);
      setAssignment(res.data);
      toast.success('Voice Assignment & Rotation Pool saved');
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save voice assignment');
    } finally {
      setSaving(false);
    }
  }

  function togglePoolVoice(voiceId: string) {
    if (!assignment) return;
    const exists = assignment.rotationPoolIds.includes(voiceId);
    const nextPool = exists
      ? assignment.rotationPoolIds.filter((id) => id !== voiceId)
      : [...assignment.rotationPoolIds, voiceId];
    if (nextPool.length === 0) {
      toast.error('At least 1 voice must remain in the Rotation Pool');
      return;
    }
    setAssignment({ ...assignment, rotationPoolIds: nextPool });
  }

  function toggleShortlist(voiceId: string) {
    if (!assignment) return;
    const exists = assignment.shortlistedVoiceIds.includes(voiceId);
    const nextList = exists
      ? assignment.shortlistedVoiceIds.filter((id) => id !== voiceId)
      : [...assignment.shortlistedVoiceIds, voiceId];
    setAssignment({ ...assignment, shortlistedVoiceIds: nextList });
  }

  async function handlePlay15SecSample(targetVoiceId?: string) {
    const voiceToPlay = targetVoiceId || previewVoiceId;
    if (targetVoiceId) setPreviewVoiceId(targetVoiceId);

    try {
      const res: any = await api.post(`/api/agents/${agentId}/voice-library/preview`, {
        voiceId: voiceToPlay,
        language: previewLanguage,
        pace: previewPace,
        brandName: assignment?.customBrandName || 'IGI Insurance',
      });
      const payload: PreviewPayload = res.data;
      setPreviewData(payload);
      setIsPlaying(true);

      // Play acoustic chime envelope
      if (typeof window !== 'undefined' && payload.audioPreviewDataUri) {
        const audio = new Audio(payload.audioPreviewDataUri);
        audio.play().catch(() => {});
      }

      // Speak full 15s script via Web Speech API if available in browser
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(payload.fullScript);
        utterance.rate = previewPace === 'slow' ? 0.85 : previewPace === 'fast' ? 1.2 : 1.0;
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setIsPlaying(false), 3000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate 15s voice sample');
      setIsPlaying(false);
    }
  }

  function handleStopSample() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }

  async function handleSimulateNextSessionCall() {
    try {
      const res: any = await api.post(`/api/agents/${agentId}/voice-library/resolve-session`, {
        channel: 'web_voice',
      });
      if (res.data) {
        setLastResolvedSession({
          personaName: res.data.persona?.name || res.data.resolvedVoiceId,
          reason: res.data.resolutionReason,
          mode: res.data.mode,
        });
        await loadVoiceLibrary();
        toast.success(`Session resolved to: ${res.data.persona?.name}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to simulate session voice resolution');
    }
  }

  if (loading || !assignment) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 flex items-center gap-3 text-xs text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
        Loading V3C Multi-Voice Persona Library &amp; 15-Second Preview Player...
      </div>
    );
  }

  const displayedCatalog = showShortlistOnly
    ? catalog.filter((c) => assignment.shortlistedVoiceIds.includes(c.id))
    : catalog;

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 p-5 space-y-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              V3C Multi-Voice Persona Library, Rotation Pool &amp; 15s Sample Player
            </h3>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
              Blueprint Sec 7.2
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign a fixed persona, rotate through a multi-voice pool per session, or map voices by channel, time-of-day, or customer segment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSimulateNextSessionCall}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Simulate Next Call Voice
          </button>
          <button
            type="button"
            onClick={handleSaveAssignment}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Save Voice Pool
          </button>
        </div>
      </div>

      {lastResolvedSession && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-900">
          <div>
            <span className="font-bold">Simulated Session Persona:</span> {lastResolvedSession.personaName}{' '}
            <span className="text-emerald-700">({lastResolvedSession.reason})</span>
          </div>
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
            {lastResolvedSession.mode}
          </span>
        </div>
      )}

      {/* Assignment Mode Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { id: 'FIXED', label: 'Fixed Voice', icon: Volume2 },
          { id: 'ROTATION_POOL', label: 'Rotation Pool', icon: Shuffle },
          { id: 'CHANNEL_SPECIFIC', label: 'Channel-Specific', icon: Radio },
          { id: 'TIME_OF_DAY', label: 'Time-of-Day', icon: Clock },
          { id: 'CUSTOMER_SEGMENT', label: 'Customer Segment', icon: Users },
        ].map((m) => {
          const Icon = m.icon;
          const active = assignment.mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setAssignment({ ...assignment, mode: m.id as any })}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Mode-Specific Controls */}
      {assignment.mode === 'CHANNEL_SPECIFIC' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-white p-3.5 border border-slate-200">
          {(['web_voice', 'outbound_campaign', 'whatsapp_voice'] as const).map((ch) => (
            <div key={ch}>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                {ch.replace('_', ' ')}
              </label>
              <select
                value={assignment.channelMap[ch]}
                onChange={(e) =>
                  setAssignment({
                    ...assignment,
                    channelMap: { ...assignment.channelMap, [ch]: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              >
                {catalog.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.category}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {assignment.mode === 'TIME_OF_DAY' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-white p-3.5 border border-slate-200">
          {[
            { key: 'morningVoiceId', label: 'Morning (09:00–13:00 Energetic)' },
            { key: 'afternoonEveningVoiceId', label: 'Afternoon (13:00–20:00 Formal)' },
            { key: 'afterHoursVoiceId', label: 'After-Hours (20:00–09:00 Calm)' },
          ].map((slot) => (
            <div key={slot.key}>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">{slot.label}</label>
              <select
                value={(assignment.timeWindowMap as any)[slot.key]}
                onChange={(e) =>
                  setAssignment({
                    ...assignment,
                    timeWindowMap: { ...assignment.timeWindowMap, [slot.key]: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              >
                {catalog.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.category}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {assignment.mode === 'CUSTOMER_SEGMENT' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-white p-3.5 border border-slate-200">
          {[
            { key: 'premium', label: 'Premium / Corporate Tier Voice' },
            { key: 'standard', label: 'Standard Retail Tier Voice' },
          ].map((seg) => (
            <div key={seg.key}>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">{seg.label}</label>
              <select
                value={(assignment.segmentMap as any)[seg.key]}
                onChange={(e) =>
                  setAssignment({
                    ...assignment,
                    segmentMap: { ...assignment.segmentMap, [seg.key]: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              >
                {catalog.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.category}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* 15-Second Standardized Sample Preview Player */}
      <div className="rounded-xl border border-indigo-200 bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              15-Second Standardized Voice Sample Preview Player
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShortlistOnly(!showShortlistOnly)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold border cursor-pointer ${
                showShortlistOnly
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <Star className="h-3 w-3" />
              Shortlisted ({assignment.shortlistedVoiceIds.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Custom Brand Name</label>
            <input
              type="text"
              value={assignment.customBrandName}
              onChange={(e) => setAssignment({ ...assignment, customBrandName: e.target.value })}
              placeholder="e.g. IGI Life Takaful"
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Preview Language</label>
            <select
              value={previewLanguage}
              onChange={(e) => setPreviewLanguage(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              {['English', 'Urdu', 'Sindhi', 'Punjabi', 'Pashto', 'Arabic'].map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Speaking Pace</label>
            <select
              value={previewPace}
              onChange={(e) => setPreviewPace(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="slow">Slow (0.85x)</option>
              <option value="normal">Normal (1.0x)</option>
              <option value="fast">Fast (1.20x)</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            {!isPlaying ? (
              <button
                type="button"
                onClick={() => handlePlay15SecSample()}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" />
                Play 15s Sample
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopSample}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" />
                Stop Preview
              </button>
            )}
          </div>
        </div>

        {previewData && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-700">
              <span>
                Playing: {previewData.personaName} ({previewData.category}) • Brand: &ldquo;{previewData.brandNameInjected}&rdquo;
              </span>
              <span>15s Standard Script ({previewData.pace.toUpperCase()})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {previewData.segments.map((seg, idx) => (
                <div key={idx} className="rounded-md bg-white p-2 border border-slate-200 text-[11px]">
                  <div className="font-bold text-slate-700 mb-0.5">{seg.stage}</div>
                  <div className="text-slate-600 leading-snug">{seg.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Voice Library Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayedCatalog.map((v) => {
          const inPool = assignment.rotationPoolIds.includes(v.id);
          const isShortlisted = assignment.shortlistedVoiceIds.includes(v.id);
          const isPrimaryFixed = assignment.fixedVoiceId === v.id;

          return (
            <div
              key={v.id}
              className={`rounded-xl border p-3.5 transition flex flex-col justify-between ${
                inPool && assignment.mode === 'ROTATION_POOL'
                  ? 'border-indigo-400 bg-indigo-50/40'
                  : isPrimaryFixed && assignment.mode === 'FIXED'
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{v.name}</div>
                    <div className="text-[10px] font-semibold text-indigo-600">{v.category}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleShortlist(v.id)}
                    title="Shortlist voice for comparison"
                    className={`p-1 rounded-md cursor-pointer ${
                      isShortlisted ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'
                    }`}
                  >
                    <Star className="h-4 w-4 fill-current" />
                  </button>
                </div>

                <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">{v.characteristics}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {v.supportedLanguages.map((lang) => (
                    <span
                      key={lang}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handlePlay15SecSample(v.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  <Play className="h-3 w-3" /> Preview 15s
                </button>

                {assignment.mode === 'ROTATION_POOL' ? (
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inPool}
                      onChange={() => togglePoolVoice(v.id)}
                      className="rounded border-slate-300 text-indigo-600 h-3.5 w-3.5"
                    />
                    In Pool
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAssignment({ ...assignment, fixedVoiceId: v.id })}
                    className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase cursor-pointer ${
                      isPrimaryFixed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isPrimaryFixed ? 'Selected Primary' : 'Set Primary'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
