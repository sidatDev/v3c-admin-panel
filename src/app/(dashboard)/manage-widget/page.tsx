'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Settings, 
  Globe, 
  Volume2, 
  MessageSquare, 
  Mic, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  RefreshCw,
  Sparkles,
  Shield,
  Code
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface VoiceOption {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  description: string;
  sampleUrl: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'alloy', name: 'Alloy', gender: 'Male', description: 'Neutral and balanced', sampleUrl: 'https://cdn.openai.com/speech/alloy.mp3' },
  { id: 'echo', name: 'Echo', gender: 'Male', description: 'Clear and articulate', sampleUrl: 'https://cdn.openai.com/speech/echo.mp3' },
  { id: 'fable', name: 'Fable', gender: 'Male', description: 'Warm and expressive', sampleUrl: 'https://cdn.openai.com/speech/fable.mp3' },
  { id: 'onyx', name: 'Onyx', gender: 'Male', description: 'Deep and authoritative', sampleUrl: 'https://cdn.openai.com/speech/onyx.mp3' },
  { id: 'nova', name: 'Nova', gender: 'Female', description: 'Friendly and energetic', sampleUrl: 'https://cdn.openai.com/speech/nova.mp3' },
  { id: 'shimmer', name: 'Shimmer', gender: 'Female', description: 'Soft and gentle', sampleUrl: 'https://cdn.openai.com/speech/shimmer.mp3' },
  { id: 'coral', name: 'Coral', gender: 'Female', description: 'Bright and clear', sampleUrl: 'https://cdn.openai.com/speech/coral.mp3' },
  { id: 'ash', name: 'Ash', gender: 'Male', description: 'Gentle and polite', sampleUrl: 'https://cdn.openai.com/speech/ash.mp3' },
  { id: 'sage', name: 'Sage', gender: 'Female', description: 'Calm and empathetic', sampleUrl: 'https://cdn.openai.com/speech/sage.mp3' },
  { id: 'verse', name: 'Verse', gender: 'Male', description: 'Dynamic and engaging', sampleUrl: 'https://cdn.openai.com/speech/verse.mp3' },
];

const COUNTRIES = [
  { code: 'US', name: 'United States (US)' },
  { code: 'GB', name: 'United Kingdom (GB)' },
  { code: 'CA', name: 'Canada (CA)' },
  { code: 'AU', name: 'Australia (AU)' },
  { code: 'PK', name: 'Pakistan (PK)' },
  { code: 'DE', name: 'Germany (DE)' },
  { code: 'FR', name: 'France (FR)' },
  { code: 'IN', name: 'India (IN)' },
];

interface WidgetData {
  widgetConfig: {
    id: number;
    isActive: boolean;
    style: string;
    allowLeadForm: boolean;
    enableAiBrowser: boolean;
    showQuickQuestions: boolean;
    showPreSessionForm: boolean;
    interactionLimit: number;
    defaultMode: string;
    widgetMode: string;
    allowedCountries: string[];
  };
  agent: {
    id: string;
    voice: string;
    accentColor: string;
    defaultMode: string;
    widgetMode: string;
    isActive: boolean;
  };
  quickQuestions: {
    id: number;
    question: string;
    defaultAnswer: string;
  }[];
}

interface EmbedData {
  publicKey: string;
  embedScript: string;
}

export default function ManageWidgetPage() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  // Form states for Quick Question
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // 1. Fetch Widget Settings
  const { data: widgetData, isLoading, refetch, isRefetching } = useQuery<WidgetData>({
    queryKey: ['widget-config'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: WidgetData }>('/api/widget');
      return res.data;
    },
  });

  // 2. Fetch Embed Code
  const { data: embedData } = useQuery<EmbedData>({
    queryKey: ['widget-embed-code'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: EmbedData }>('/api/widget/embed-code');
      return res.data;
    },
  });

  // Save Settings Mutation
  const updateWidgetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put<{ status: string; data: any }>('/api/widget', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-config'] });
      toast.success('Widget configuration saved successfully!');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update widget config.');
      }
    },
  });

  // Quick Questions Mutations
  const addQuestionMutation = useMutation({
    mutationFn: async (payload: { question: string; defaultAnswer: string }) => {
      const res = await api.post('/api/widget/quick-questions', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-config'] });
      toast.success('Quick Question added!');
      setNewQuestion('');
      setNewAnswer('');
    },
    onError: (error) => {
      toast.error('Failed to add quick question.');
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/widget/quick-questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-config'] });
      toast.success('Quick Question removed!');
    },
  });

  const config = widgetData?.widgetConfig;
  const agent = widgetData?.agent;
  const quickQuestions = widgetData?.quickQuestions || [];

  // Toggle helper
  const handleToggle = (key: string, value: boolean) => {
    updateWidgetMutation.mutate({ [key]: value });
  };

  const handleSelectVoice = (voiceId: string) => {
    updateWidgetMutation.mutate({ voice: voiceId });
  };

  const handleSelectMode = (mode: string) => {
    updateWidgetMutation.mutate({ widgetMode: mode });
  };

  const handleSelectStyle = (styleName: string) => {
    updateWidgetMutation.mutate({ style: styleName });
  };

  const handleCountryToggle = (code: string) => {
    const current = config?.allowedCountries || [];
    const updated = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    updateWidgetMutation.mutate({ allowedCountries: updated });
  };

  const playVoiceSample = (sampleUrl: string, voiceId: string) => {
    try {
      const audio = new Audio(sampleUrl);
      setPlayingVoice(voiceId);
      audio.play().catch(() => {
        toast.info(`Simulating OpenAI voice preview for '${voiceId}'`);
      });
      audio.onended = () => setPlayingVoice(null);
    } catch {
      toast.info(`Previewing '${voiceId}' voice sample`);
    }
  };

  const copyEmbedCode = () => {
    if (embedData?.embedScript) {
      navigator.clipboard.writeText(embedData.embedScript);
      setCopied(true);
      toast.success('Embed script copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-600" />
            Manage Widget
          </h1>
          <p className="text-sm text-slate-500">
            Configure your website widget settings, access controls, voice preferences, and embed script.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* SECTION 1: CRITICAL CONTROLS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Shield className="h-5 w-5 text-indigo-600" />
          <h2 className="font-semibold text-slate-900 text-base">Critical Controls</h2>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Widget Status</h3>
            <p className="text-xs text-slate-500">Enable or disable the widget globally on all client websites.</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1">
              {config?.isActive ? 'Widget is currently active and visible to visitors' : 'Widget is disabled'}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config?.isActive ?? true}
              onChange={(e) => handleToggle('isActive', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      {/* SECTION 2: ACCESS CONTROLS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Globe className="h-5 w-5 text-indigo-600" />
          <h2 className="font-semibold text-slate-900 text-base">Access Controls</h2>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Country Restrictions</h3>
          <p className="text-xs text-slate-500">Restrict widget visibility to specific countries.</p>

          <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
            {config?.allowedCountries && config.allowedCountries.length > 0 ? (
              <p>Restricted to: <span className="font-semibold text-slate-900">{config.allowedCountries.join(', ')}</span></p>
            ) : (
              <p>Current Status: <span className="font-semibold text-emerald-600">Widget is visible in all countries</span></p>
            )}
          </div>

          <div className="mt-3">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
            />

            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 space-y-1">
              {filteredCountries.map((c) => {
                const isSelected = config?.allowedCountries?.includes(c.code) || false;
                return (
                  <label
                    key={c.code}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <span className="text-slate-800 font-medium">{c.name}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCountryToggle(c.code)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: APPEARANCE & BEHAVIOR & VOICE SELECTION */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Side: Style & Widget Toggles */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 text-base">Appearance & Behavior</h2>
          </div>

          {/* Widget Style selection */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Widget Style</h3>
            <div className="space-y-2">
              {['Style 1', 'Style 2', 'Style 3'].map((st) => (
                <label key={st} className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="widgetStyle"
                    checked={config?.style === st}
                    onChange={() => handleSelectStyle(st)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{st}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Settings Toggles */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Widget Toggles</h3>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Allow Lead Form</span>
              <input
                type="checkbox"
                checked={config?.allowLeadForm ?? true}
                onChange={(e) => handleToggle('allowLeadForm', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Enable AI Browser</span>
              <input
                type="checkbox"
                checked={config?.enableAiBrowser ?? true}
                onChange={(e) => handleToggle('enableAiBrowser', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Show Quick Questions</span>
              <input
                type="checkbox"
                checked={config?.showQuickQuestions ?? false}
                onChange={(e) => handleToggle('showQuickQuestions', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Show Info Form (Lead Capture) Before Chat</span>
              <input
                type="checkbox"
                checked={config?.showPreSessionForm ?? true}
                onChange={(e) => handleToggle('showPreSessionForm', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Capabilities & Voice Selection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Mic className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 text-base">Widget Capabilities & Voice</h2>
          </div>

          {/* Modes selector */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Capabilities</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectMode('CHAT')}
                className={`p-3 rounded-xl border text-center text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  config?.widgetMode === 'CHAT'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Chat Only
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('VOICE')}
                className={`p-3 rounded-xl border text-center text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  config?.widgetMode === 'VOICE'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Mic className="h-4 w-4" />
                Voice Only
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('BOTH')}
                className={`p-3 rounded-xl border text-center text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  config?.widgetMode === 'BOTH'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex gap-0.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <Mic className="h-3.5 w-3.5" />
                </div>
                Both Modes
              </button>
            </div>
          </div>

          {/* Voice Selection Options (10 OpenAI voices with gender & preview) */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Voice Selection</h3>
            <p className="text-xs text-slate-400">Choose the voice for your AI assistant in voice mode.</p>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {VOICE_OPTIONS.map((v) => {
                const isSelected = (agent?.voice || 'alloy').toLowerCase() === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelectVoice(v.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="voiceOption"
                        checked={isSelected}
                        onChange={() => handleSelectVoice(v.id)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">{v.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            v.gender === 'Male' ? 'bg-slate-900 text-white' : 'bg-pink-100 text-pink-700'
                          }`}>
                            {v.gender}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">{v.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playVoiceSample(v.sampleUrl, v.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                      title={`Preview ${v.name} voice`}
                    >
                      <Volume2 className={`h-4 w-4 ${playingVoice === v.id ? 'animate-pulse text-indigo-600' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: CONTENT MANAGEMENT (QUICK QUESTIONS) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <MessageSquare className="h-5 w-5 text-indigo-600" />
          <h2 className="font-semibold text-slate-900 text-base">Content Management</h2>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Quick Questions</h3>
          
          {/* Quick Questions Table */}
          {quickQuestions.length > 0 ? (
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-100 font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Question</th>
                    <th className="p-3">Default Answer</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quickQuestions.map((q) => (
                    <tr key={q.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{q.question}</td>
                      <td className="p-3 text-slate-500 truncate max-w-xs">{q.defaultAnswer}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => deleteQuestionMutation.mutate(q.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic mb-4">No quick questions added yet.</p>
          )}

          {/* Add New Question Form */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Add New Question</h4>
            <input
              type="text"
              placeholder="Enter question (e.g. What are your business hours?)"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 bg-white"
            />
            <textarea
              rows={2}
              placeholder="Enter default answer..."
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 bg-white resize-none"
            />
            <button
              type="button"
              onClick={() => {
                if (newQuestion && newAnswer) {
                  addQuestionMutation.mutate({ question: newQuestion, defaultAnswer: newAnswer });
                } else {
                  toast.error('Please enter both question and default answer.');
                }
              }}
              disabled={addQuestionMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Question
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: EMBED CODE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Code className="h-5 w-5 text-indigo-600" />
          <h2 className="font-semibold text-slate-900 text-base">Embed Code</h2>
        </div>

        <p className="text-xs text-slate-500">
          Paste this script snippet before the closing <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">&lt;/body&gt;</code> tag on your website.
        </p>

        <div className="relative rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs text-indigo-300 font-mono overflow-x-auto">
          <pre>{embedData?.embedScript || '<!-- Loading embed code... -->'}</pre>
          <button
            onClick={copyEmbedCode}
            className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-sans font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>
        </div>
      </div>
    </div>
  );
}
