'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, MessageSquare, Bot, User, Clock, Globe, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  createdAt: string;
}

interface ClientDetails {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  ipAddress: string | null;
  createdAt: string;
  visitorSessionId: number | null;
  PotentialClient?: {
    confidenceScore: number;
    summary: string;
    reasoning: string | null;
    keyIntents: string[];
    evaluatedAt: string;
  } | null;
  VisitorSession?: {
    channel: string | null;
    startedAt: string;
  } | null;
}

interface ChatHistoryModalProps {
  clientId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatHistoryModal({ clientId, isOpen, onClose }: ChatHistoryModalProps) {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['lead-conversations', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      return api.get<{
        status: string;
        data: {
          client: ClientDetails;
          conversations: ChatMessage[];
        };
      }>(`/api/leads/${clientId}/conversations`);
    },
    enabled: isOpen && !!clientId,
  });

  if (!isOpen) return null;

  const client = response?.data?.client;
  const messages = response?.data?.conversations || [];
  const score = client?.PotentialClient?.confidenceScore;

  const getScoreBadge = (val: number) => {
    if (val >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (val >= 65) return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Chat History: {client?.name || 'Loading...'}
                {score !== undefined && score !== null && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${getScoreBadge(score)}`}>
                    Score: {score}%
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                {client?.email && <span>{client.email}</span>}
                {client?.phone && <span>• {client.phone}</span>}
                {client?.ipAddress && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Globe className="h-3 w-3" /> {client.ipAddress}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* AI Summary Banner (if Potential Client) */}
        {client?.PotentialClient && (
          <div className="px-6 py-3 bg-indigo-950/30 border-b border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-indigo-300">AI Qualification Summary:</span>
              <p className="text-slate-300 leading-relaxed">{client.PotentialClient.summary}</p>
              {client.PotentialClient.keyIntents && client.PotentialClient.keyIntents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {client.PotentialClient.keyIntents.map((intent, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-medium border border-indigo-500/30">
                      {intent}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Transcript Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[55vh] min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
              <div className="h-7 w-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              Loading transcript...
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-48 text-red-400 text-sm">
              <AlertCircle className="h-6 w-6 mb-2" />
              Failed to load conversation history.
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm">
              <MessageSquare className="h-8 w-8 mb-2 stroke-1" />
              No transcript recorded for this session yet.
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender.toLowerCase() === 'visitor' || msg.sender.toLowerCase() === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="h-7 w-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-indigo-400">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <div className={`flex items-center gap-1 text-[10px] mt-1.5 ${isUser ? 'text-indigo-200 justify-end' : 'text-slate-400'}`}>
                      <Clock className="h-2.5 w-2.5" />
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  {isUser && (
                    <div className="h-7 w-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0 text-slate-300">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
          <span>{messages.length} message turn(s) recorded</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
