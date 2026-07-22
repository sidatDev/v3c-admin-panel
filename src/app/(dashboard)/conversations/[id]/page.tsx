'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, User, Bot, Globe, Calendar, RefreshCw, Mail, Phone } from 'lucide-react';
import { api } from '@/lib/api';

interface TranscriptItem {
  id: number;
  message: string;
  sender: string;
  createdAt: string;
  Lead?: {
    name: string;
    email: string | null;
  } | null;
  Agent?: {
    name: string;
  } | null;
}

interface ConversationDetailResponse {
  conversation: {
    id: number;
    message: string;
    sender: string;
    createdAt: string;
    Lead?: {
      id: number;
      name: string;
      email: string | null;
      phone: string | null;
      status: string;
    } | null;
    Agent?: {
      id: string;
      name: string;
    } | null;
    VisitorSession?: {
      id: number;
      referrer: string | null;
      landingPage: string | null;
      startedAt: string;
      status: string;
    } | null;
  };
  transcript: TranscriptItem[];
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.id;

  const { data, isLoading, isError, refetch } = useQuery<ConversationDetailResponse>({
    queryKey: ['conversation-detail', conversationId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ConversationDetailResponse }>(
        `/api/conversations/${conversationId}`
      );
      return res.data;
    },
    enabled: !!conversationId,
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Conversation Not Found</h2>
        <p className="mt-1 text-sm text-slate-500">
          The requested conversation transcript does not exist or has been deleted.
        </p>
        <Link
          href="/conversations"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Conversations
        </Link>
      </div>
    );
  }

  const { conversation, transcript } = data;
  const lead = conversation.Lead;
  const session = conversation.VisitorSession;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/conversations"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Transcript #{conversation.id}
            </h1>
            <p className="text-xs text-slate-500">
              {new Date(conversation.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Main Grid: Transcript Timeline & Sidebar Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Chat Transcript Timeline */}
        <div className="lg:col-span-2 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[500px]">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              Interaction History ({transcript.length} messages)
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {transcript.map((msg) => {
              const isUser = msg.sender?.toLowerCase() === 'user' || msg.sender?.toLowerCase() === 'lead' || msg.sender?.toLowerCase() === 'visitor';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[80%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isUser
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${isUser ? 'text-indigo-200' : 'text-slate-500'}`}>
                        {isUser ? (lead?.name || 'Visitor') : (conversation.Agent?.name || 'V3C AI Assistant')}
                      </span>
                      <span className={`text-[10px] ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Metadata Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          {/* Lead Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              Lead Details
            </h3>
            
            {lead ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Name</span>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">{lead.name}</p>
                </div>
                {lead.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 font-medium">Status</span>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 border border-emerald-100">
                      {lead.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No lead form submitted during this session.</p>
            )}
          </div>

          {/* Session Metadata Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-600" />
              Session Information
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 font-medium">Assigned AI Agent</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {conversation.Agent?.name || 'V3C AI Assistant'}
                </p>
              </div>

              {session?.referrer && (
                <div>
                  <span className="text-slate-400 font-medium">Referrer</span>
                  <p className="truncate text-slate-700 mt-0.5">{session.referrer}</p>
                </div>
              )}

              {session?.landingPage && (
                <div>
                  <span className="text-slate-400 font-medium">Landing Page</span>
                  <p className="truncate text-slate-700 mt-0.5">{session.landingPage}</p>
                </div>
              )}

              <div>
                <span className="text-slate-400 font-medium">Session Started</span>
                <p className="text-slate-700 mt-0.5">
                  {session?.startedAt ? new Date(session.startedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
