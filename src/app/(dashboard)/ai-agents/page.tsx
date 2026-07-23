'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Cpu,
  Mic,
  Sliders,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Link as LinkIcon,
  Globe,
  MessageSquare,
  Volume2,
  ShieldAlert,
  Edit3
} from 'lucide-react';

interface AgentItem {
  id: string;
  name: string;
  voice: string;
  language: string;
  systemPrompt: string;
  initialGreetingMessage: string;
  defaultMode: string;
  widgetMode: string;
  accentColor: string;
  speechSpeed: number;
  voiceStability: number;
  voiceWarmth: number;
  autoLanguageDetection: boolean;
  supportedLanguages: string[];
  isActive: boolean;
  RetrievalConfig?: {
    similarityThreshold: number;
    topK: number;
    maxContextTokens: number;
    fallbackMode: string;
    fallbackMessage: string;
    fallbackMessageUrdu: string;
  };
  AgentTopicLink?: { id: string; title: string; url: string; displayOrder: number }[];
}

export default function AiAgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'voice' | 'retrieval' | 'topic_links' | 'prompt'>('voice');

  // Topic Link form
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      setLoading(true);
      const res: any = await api.get('/api/agents');
      const list = res.data || [];
      setAgents(list);
      if (list.length > 0) {
        setSelectedAgent(list[0]);
      }
    } catch (err: any) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAgent() {
    if (!selectedAgent) return;
    try {
      setSaving(true);
      setSuccessMsg(null);

      await api.put(`/api/agents/${selectedAgent.id}`, {
        name: selectedAgent.name,
        voice: selectedAgent.voice,
        language: selectedAgent.language,
        systemPrompt: selectedAgent.systemPrompt,
        initialGreetingMessage: selectedAgent.initialGreetingMessage,
        speechSpeed: selectedAgent.speechSpeed,
        voiceStability: selectedAgent.voiceStability,
        voiceWarmth: selectedAgent.voiceWarmth,
        autoLanguageDetection: selectedAgent.autoLanguageDetection,
        supportedLanguages: selectedAgent.supportedLanguages,
        accentColor: selectedAgent.accentColor,
        isActive: selectedAgent.isActive,
      });

      if (selectedAgent.RetrievalConfig) {
        await api.put(`/api/agents/${selectedAgent.id}/retrieval-config`, {
          similarityThreshold: selectedAgent.RetrievalConfig.similarityThreshold,
          topK: selectedAgent.RetrievalConfig.topK,
          fallbackMode: selectedAgent.RetrievalConfig.fallbackMode,
          fallbackMessage: selectedAgent.RetrievalConfig.fallbackMessage,
          fallbackMessageUrdu: selectedAgent.RetrievalConfig.fallbackMessageUrdu,
        });
      }

      setSuccessMsg('Agent & Retrieval settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadAgents();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTopicLink() {
    if (!selectedAgent || !newLinkTitle || !newLinkUrl) return;
    try {
      await api.post(`/api/agents/${selectedAgent.id}/topic-links`, {
        title: newLinkTitle,
        url: newLinkUrl,
      });
      setNewLinkTitle('');
      setNewLinkUrl('');
      loadAgents();
    } catch (err: any) {
      alert(err.message || 'Failed to add topic link');
    }
  }

  async function handleDeleteTopicLink(linkId: string) {
    if (!selectedAgent) return;
    try {
      await api.delete(`/api/agents/${selectedAgent.id}/topic-links/${linkId}`);
      loadAgents();
    } catch (err: any) {
      alert(err.message || 'Failed to remove link');
    }
  }

  async function handleImportFromKb() {
    if (!selectedAgent) return;
    try {
      await api.post(`/api/agents/${selectedAgent.id}/topic-links`, {
        importFromKb: true,
        limit: 5,
      });
      loadAgents();
    } catch (err: any) {
      alert(err.message || 'Failed to import links from KB');
    }
  }

  async function handleCreateAgent() {
    try {
      const res: any = await api.post('/api/agents', {
        name: 'New AI Agent',
        voice: 'shimmer',
        language: 'English',
        systemPrompt: 'You are an AI Virtual Customer Assistant.',
        initialGreetingMessage: 'Hi! How can I help you today?',
        defaultMode: 'VOICE',
        widgetMode: 'BOTH',
        accentColor: '#4F46E5',
        speechSpeed: 1.0,
        voiceStability: 0.5,
        voiceWarmth: 0.5,
        autoLanguageDetection: true,
        supportedLanguages: ['English'],
        isActive: true
      });
      toast.success('Agent created successfully!');
      await loadAgents();
      if (res.data) {
        setSelectedAgent(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create agent');
    }
  }

  async function handleDeleteAgent(agentId: string) {
    if (agents.length <= 1) {
      alert("You must keep at least one AI Agent.");
      return;
    }
    const confirmDelete = window.confirm("Are you sure you want to delete this agent?");
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/agents/${agentId}`);
      toast.success('Agent deleted successfully!');
      await loadAgents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete agent');
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Cpu className="h-7 w-7 text-indigo-600" />
            AI Agents & Retrieval Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure AI voice parameters, confidence-based vector search thresholds, system prompts, and out-of-scope topic links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedAgent && (
            <button
              onClick={() => handleDeleteAgent(selectedAgent.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Delete Agent
            </button>
          )}
          <button
            onClick={handleSaveAgent}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-medium">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Agent Selector List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tenant AI Agents</h3>
              <button
                onClick={handleCreateAgent}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Agent
              </button>
            </div>
            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border ${
                    selectedAgent?.id === agent.id
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-medium shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{agent.name || 'AI Agent'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Voice: {agent.voice || 'alloy'} | {agent.language || 'English'}</div>
                  </div>
                  {agent.isActive ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Agent Settings */}
        {selectedAgent && (
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-3 pt-2 gap-2 shadow-xs">
              <button
                onClick={() => setActiveTab('voice')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl transition border-b-2 ${
                  activeTab === 'voice'
                    ? 'border-indigo-600 text-indigo-600 bg-slate-50/60'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mic className="h-4 w-4" /> Voice & Speech
              </button>
              <button
                onClick={() => setActiveTab('retrieval')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl transition border-b-2 ${
                  activeTab === 'retrieval'
                    ? 'border-indigo-600 text-indigo-600 bg-slate-50/60'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sliders className="h-4 w-4" /> Confidence & Fallback
              </button>
              <button
                onClick={() => setActiveTab('topic_links')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl transition border-b-2 ${
                  activeTab === 'topic_links'
                    ? 'border-indigo-600 text-indigo-600 bg-slate-50/60'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <LinkIcon className="h-4 w-4" /> Topic Page Links
              </button>
              <button
                onClick={() => setActiveTab('prompt')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl transition border-b-2 ${
                  activeTab === 'prompt'
                    ? 'border-indigo-600 text-indigo-600 bg-slate-50/60'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Edit3 className="h-4 w-4" /> System Instructions
              </button>
            </div>

            {/* Tab 1: Voice & Speech */}
            {activeTab === 'voice' && (
              <div className="rounded-b-2xl border border-t-0 border-slate-200 bg-white p-6 space-y-6 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Agent Name</label>
                    <input
                      type="text"
                      value={selectedAgent.name || ''}
                      onChange={(e) => setSelectedAgent({ ...selectedAgent, name: e.target.value })}
                      className="w-full rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Voice Model</label>
                    <select
                      value={selectedAgent.voice || 'shimmer'}
                      onChange={(e) => setSelectedAgent({ ...selectedAgent, voice: e.target.value })}
                      className="w-full rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="shimmer">Shimmer (Clear, Calm — Female)</option>
                      <option value="alloy">Alloy (Neutral, Conversational)</option>
                      <option value="echo">Echo (Warm, Professional)</option>
                      <option value="ash">Ash (Expressive)</option>
                      <option value="ballad">Ballad (Smooth)</option>
                      <option value="coral">Coral (Warm)</option>
                      <option value="sage">Sage (Calm)</option>
                      <option value="verse">Verse (Dynamic)</option>
                      <option value="marin">Marin (Friendly)</option>
                      <option value="cedar">Cedar (Deep)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Speech Speed ({selectedAgent.speechSpeed ?? 1.0}x)</label>
                    <input
                      type="range"
                      min="0.75"
                      max="1.5"
                      step="0.05"
                      value={selectedAgent.speechSpeed ?? 1.0}
                      onChange={(e) => setSelectedAgent({ ...selectedAgent, speechSpeed: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Voice Warmth / Tone</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={selectedAgent.voiceWarmth ?? 0.5}
                      onChange={(e) => setSelectedAgent({ ...selectedAgent, voiceWarmth: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Initial Greeting Message</label>
                  <input
                    type="text"
                    value={selectedAgent.initialGreetingMessage || ''}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, initialGreetingMessage: e.target.value })}
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Supported Languages</label>
                  <div className="flex items-center gap-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    {['English', 'Urdu'].map((lang) => {
                      const currentLangs = selectedAgent.supportedLanguages || ['English'];
                      const isChecked = currentLangs.includes(lang);
                      return (
                        <label key={lang} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let nextLangs: string[];
                              if (e.target.checked) {
                                nextLangs = Array.from(new Set([...currentLangs, lang]));
                              } else {
                                nextLangs = currentLangs.filter((l) => l !== lang);
                                if (nextLangs.length === 0) nextLangs = ['English']; // keep at least one
                              }
                              setSelectedAgent({ ...selectedAgent, supportedLanguages: nextLangs });
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                          {lang}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Enable Urdu and English multi-lingual support for voice and text chat.</p>
                </div>
              </div>
            )}

            {/* Tab 2: Confidence & Fallback */}
            {activeTab === 'retrieval' && selectedAgent.RetrievalConfig && (
              <div className="rounded-b-2xl border border-t-0 border-slate-200 bg-white p-6 space-y-6 shadow-xs">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Similarity Threshold ({selectedAgent.RetrievalConfig.similarityThreshold ?? 0.3})</label>
                    <span className="text-xs text-indigo-600 font-mono font-semibold">Min Cosine Similarity</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={selectedAgent.RetrievalConfig.similarityThreshold ?? 0.3}
                    onChange={(e) => setSelectedAgent({
                      ...selectedAgent,
                      RetrievalConfig: { ...selectedAgent.RetrievalConfig!, similarityThreshold: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-indigo-600"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Queries with vector similarity below this threshold will trigger the Topic Suggestion Fallback protocol instead of invoking GPT.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Out-of-Scope Fallback Message (English)</label>
                  <textarea
                    rows={2}
                    value={selectedAgent.RetrievalConfig.fallbackMessage || ''}
                    onChange={(e) => setSelectedAgent({
                      ...selectedAgent,
                      RetrievalConfig: { ...selectedAgent.RetrievalConfig!, fallbackMessage: e.target.value }
                    })}
                    className="w-full rounded-xl bg-white border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Out-of-Scope Fallback Message (Urdu)</label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={selectedAgent.RetrievalConfig.fallbackMessageUrdu || ''}
                    onChange={(e) => setSelectedAgent({
                      ...selectedAgent,
                      RetrievalConfig: { ...selectedAgent.RetrievalConfig!, fallbackMessageUrdu: e.target.value }
                    })}
                    className="w-full rounded-xl bg-white border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none font-sans"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Topic Page Links */}
            {activeTab === 'topic_links' && (
              <div className="rounded-b-2xl border border-t-0 border-slate-200 bg-white p-6 space-y-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Configured Topic Links for Fallback</h4>
                    <p className="text-xs text-slate-500">These links are presented to users when queries are outside KB scope.</p>
                  </div>
                  <button
                    onClick={handleImportFromKb}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Auto-Import from KB
                  </button>
                </div>

                {/* Add Link Form */}
                <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Link Title (e.g. Motor Insurance)"
                    value={newLinkTitle || ''}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="flex-1 rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="URL (e.g. https://igiinsurance.com.pk/motor)"
                    value={newLinkUrl || ''}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="flex-1 rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                  <button
                    onClick={handleAddTopicLink}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Link
                  </button>
                </div>

                {/* List */}
                <div className="space-y-2">
                  {selectedAgent.AgentTopicLink && selectedAgent.AgentTopicLink.length > 0 ? (
                    selectedAgent.AgentTopicLink.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-indigo-600" />
                          <div>
                            <div className="font-semibold text-slate-900">{link.title}</div>
                            <div className="text-slate-500">{link.url}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteTopicLink(link.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No topic links configured yet. Click "Auto-Import from KB" to pull from crawled pages.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: System Instructions */}
            {activeTab === 'prompt' && (
              <div className="rounded-b-2xl border border-t-0 border-slate-200 bg-white p-6 space-y-4 shadow-xs">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">System Role & Behavioral Instructions</label>
                <textarea
                  rows={8}
                  value={selectedAgent.systemPrompt || ''}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, systemPrompt: e.target.value })}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-4 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:outline-none leading-relaxed"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
