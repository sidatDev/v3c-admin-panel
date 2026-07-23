'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Inbox,
  MessageSquare,
  Mic,
  Search,
  Filter,
  RefreshCw,
  Tag,
  User,
  Clock,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  Globe
} from 'lucide-react';

interface SessionItem {
  id: number;
  secureId: string;
  channel: string;
  conversationStatus: string;
  tags: string[];
  humanNotes: string;
  fallbackTriggered: boolean;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  avgResponseLatency: number;
  createdAt: string;
  Agent?: { name: string; voice: string };
  Lead?: { name: string; email: string; phone: string }[];
  Conversation?: { message: string; createdAt: string; sender: string }[];
}

export default function AgentInboxPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSessions();
  }, [statusFilter, channelFilter, search]);

  async function loadSessions() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (channelFilter) params.append('channel', channelFilter);
      if (search) params.append('search', search);

      const res: any = await api.get(`/api/inbox?${params.toString()}`);
      const list = res.data || [];
      setSessions(list);
      if (list.length > 0 && !selectedSession) {
        loadDetail(list[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load inbox sessions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: number) {
    try {
      const res: any = await api.get(`/api/inbox/${id}`);
      setSelectedSession(res.data);
    } catch (err: any) {
      console.error('Failed to load session detail:', err);
    }
  }

  async function handleStatusChange(id: number, newStatus: string) {
    try {
      await api.put(`/api/inbox/${id}`, { status: newStatus });
      loadSessions();
      if (selectedSession?.id === id) {
        setSelectedSession({ ...selectedSession, conversationStatus: newStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Inbox className="h-7 w-7 text-indigo-600" />
            CRM Conversation Inbox
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time omnichannel (Voice & Chat) conversation transcripts, metadata telemetry, and agent notes.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads, messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Channels</option>
          <option value="chat">Text Chat</option>
          <option value="voice">Realtime Voice</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>

        <button onClick={loadSessions} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session List */}
        <div className="lg:col-span-1 space-y-2 max-h-[680px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center p-8 text-indigo-600">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-xs">
              No conversations match your filters.
            </div>
          ) : (
            sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => loadDetail(sess.id)}
                className={`w-full text-left p-4 rounded-2xl transition border ${
                  selectedSession?.id === sess.id
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs font-medium'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    {sess.channel === 'voice' ? <Mic className="h-3.5 w-3.5 text-indigo-600" /> : <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />}
                    Session #{sess.id}
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    sess.conversationStatus === 'resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {sess.conversationStatus || 'open'}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-600 line-clamp-1">
                  {sess.Conversation?.[0]?.message || 'No messages'}
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Agent: {sess.Agent?.name || 'V3C AI'}</span>
                  <span>{new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Session Detail View */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-xs">
          {selectedSession ? (
            <>
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Session #{selectedSession.id}
                    {selectedSession.fallbackTriggered && (
                      <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-normal">
                        Fallback Triggered
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Agent: {selectedSession.Agent?.name || 'Default Agent'} | Mode: {selectedSession.channel || 'chat'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedSession.conversationStatus || 'open'}
                    onChange={(e) => handleStatusChange(selectedSession.id, e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="open">Status: Open</option>
                    <option value="resolved">Status: Resolved</option>
                    <option value="escalated">Status: Escalated</option>
                  </select>
                </div>
              </div>

              {/* Telemetry Stats */}
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-600">
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-semibold">Latency</span>
                  <span className="font-semibold text-slate-900">{selectedSession.avgResponseLatency || 0} ms</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-semibold">Tokens</span>
                  <span className="font-semibold text-slate-900">{(selectedSession.totalInputTokens || 0) + (selectedSession.totalOutputTokens || 0)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-400 font-semibold">Est. Cost</span>
                  <span className="font-semibold text-emerald-600">${(selectedSession.estimatedCost || 0).toFixed(4)}</span>
                </div>
              </div>

              {/* Conversation Messages Timeline */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
                {selectedSession.Conversation && selectedSession.Conversation.length > 0 ? (
                  selectedSession.Conversation.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'visitor' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                          msg.sender === 'visitor'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {msg.sender === 'visitor' ? 'Visitor' : 'AI Assistant'} &bull; {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">No message history for this session.</div>
                )}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-slate-500">Select a conversation session to view full details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
