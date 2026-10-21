'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Bot,
  UserCheck,
  Sparkles,
  Send,
  Star,
  Radio,
  BellRing,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface EvaluationItem {
  id: string;
  customerSatisfaction?: number | null;
  resolutionQuality?: number | null;
  answerRelevance?: number | null;
  overallScore?: number | null;
  feedback?: string | null;
  createdAt: string;
}

interface HumanTakeoverControlsProps {
  session: any;
  onSessionUpdated: () => void;
}

function getWsBaseUrl(): string {
  let base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' && base.includes('127.0.0.1')) {
      base = base.replace('127.0.0.1', 'localhost');
    } else if (window.location.hostname === '127.0.0.1' && base.includes('localhost')) {
      base = base.replace('localhost', '127.0.0.1');
    }
  }
  return base.replace(/^http/, 'ws');
}

export function HumanTakeoverControls({
  session,
  onSessionUpdated,
}: HumanTakeoverControlsProps) {
  const [toggling, setToggling] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  // CSAT state
  const [csatRating, setCsatRating] = useState<number>(5);
  const [csatFeedback, setCsatFeedback] = useState<string>('');
  const [submittingCsat, setSubmittingCsat] = useState(false);
  const [csatSuccess, setCsatSuccess] = useState(false);

  // Realtime WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const [realtimeAlert, setRealtimeAlert] = useState<string | null>(null);

  const isHumanMode = session?.status === 'HUMAN';
  const latestEval: EvaluationItem | undefined = session?.ConversationEvaluation?.[0];

  useEffect(() => {
    setAiSuggestion(null);
    setCsatSuccess(false);
    if (latestEval?.customerSatisfaction) {
      setCsatRating(Math.round(latestEval.customerSatisfaction));
      setCsatFeedback(latestEval.feedback || '');
    } else {
      setCsatRating(5);
      setCsatFeedback('');
    }
  }, [session?.id]);

  // Connect to Realtime WebSocket Hub
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tenantId =
      session?.tenantId ||
      localStorage.getItem('v3c_active_tenant_id') ||
      '8a123d29-99da-4db4-9141-8f6bb9b7233a';

    const wsUrl = `${getWsBaseUrl()}/api/inbox/ws?tenantId=${encodeURIComponent(tenantId)}`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.event === 'escalation_created') {
            setRealtimeAlert(
              `Real-time Escalation Alert: Session ${msg.payload?.sessionId} (${msg.payload?.reason})`
            );
            onSessionUpdated();
          } else if (
            msg.event === 'new_message' ||
            msg.event === 'session_takeover' ||
            msg.event === 'session_handback' ||
            msg.event === 'csat_submitted'
          ) {
            onSessionUpdated();
          }
        } catch (_) {
          // Ignore malformed WS message
        }
      };
    } catch (_) {
      setWsConnected(false);
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [session?.tenantId]);

  async function handleTakeover() {
    if (!session?.id) return;
    try {
      setToggling(true);
      await api.post(`/api/inbox/${session.id}/takeover`, {});
      onSessionUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to activate human takeover');
    } finally {
      setToggling(false);
    }
  }

  async function handleHandback() {
    if (!session?.id) return;
    try {
      setToggling(true);
      await api.post(`/api/inbox/${session.id}/handback`, {});
      onSessionUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to hand back session to AI');
    } finally {
      setToggling(false);
    }
  }

  async function handleGenerateSuggestion() {
    if (!session?.id) return;
    try {
      setSuggesting(true);
      const res: any = await api.post(`/api/inbox/${session.id}/suggest`, {});
      const draft = res?.data?.suggestion || '';
      setAiSuggestion(draft);
      if (draft && !replyText.trim()) {
        setReplyText(draft);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate AI suggestion');
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.id || !replyText.trim()) return;
    try {
      setSendingReply(true);
      await api.post(`/api/inbox/${session.id}/reply`, {
        message: replyText.trim(),
      });
      setReplyText('');
      setAiSuggestion(null);
      onSessionUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  }

  async function handleSubmitCsat(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.id) return;
    try {
      setSubmittingCsat(true);
      setCsatSuccess(false);
      await api.post(`/api/inbox/${session.id}/csat`, {
        rating: csatRating,
        feedback: csatFeedback.trim() || undefined,
      });
      setCsatSuccess(true);
      onSessionUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to save CSAT feedback');
    } finally {
      setSubmittingCsat(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-slate-200 pt-4">
      {/* Real-time Escalation Alert Banner */}
      {realtimeAlert && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
          <div className="flex items-center gap-2 font-semibold">
            <BellRing className="h-4 w-4 text-rose-600 animate-bounce" />
            <span>{realtimeAlert}</span>
          </div>
          <button
            onClick={() => setRealtimeAlert(null)}
            className="text-[11px] font-medium text-rose-600 underline hover:text-rose-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control Mode Bar: Takeover vs Hand Back to AI */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              isHumanMode
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}
          >
            {isHumanMode ? (
              <>
                <UserCheck className="h-3.5 w-3.5 text-amber-700" />
                Human Takeover (AI Silent Listener)
              </>
            ) : (
              <>
                <Bot className="h-3.5 w-3.5 text-emerald-700" />
                Autonomous AI Active
              </>
            )}
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Radio
              className={`h-3.5 w-3.5 ${
                wsConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'
              }`}
            />
            {wsConnected ? 'Realtime Hub Connected' : 'Realtime Standby'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isHumanMode ? (
            <button
              type="button"
              disabled={toggling}
              onClick={handleHandback}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {toggling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
              Hand Back to AI
            </button>
          ) : (
            <button
              type="button"
              disabled={toggling}
              onClick={handleTakeover}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700 disabled:opacity-50"
            >
              {toggling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              Take Over Conversation
            </button>
          )}
        </div>
      </div>

      {/* Silent-Listener AI Suggestion + Human Operator Reply Composer */}
      <form
        onSubmit={handleSendReply}
        className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800">
            Human Agent Reply &amp; Silent-Listener AI Assistant
          </span>
          <button
            type="button"
            disabled={suggesting}
            onClick={handleGenerateSuggestion}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
          >
            {suggesting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 text-indigo-600" />
            )}
            Suggest AI Reply (Silent Listener)
          </button>
        </div>

        {aiSuggestion && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-2.5 text-xs text-indigo-950">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                AI Silent-Listener Draft
              </span>
              <button
                type="button"
                onClick={() => setReplyText(aiSuggestion)}
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                Use Draft
              </button>
            </div>
            <p className="leading-relaxed">{aiSuggestion}</p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type a human operator reply to send to the visitor..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sendingReply || !replyText.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {sendingReply ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send
          </button>
        </div>
      </form>

      {/* CSAT Rating & Post-Conversation Feedback */}
      <form
        onSubmit={handleSubmitCsat}
        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">
              CSAT &amp; Quality Feedback
            </span>
            {latestEval?.customerSatisfaction && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Recorded: {latestEval.customerSatisfaction}/5 ★
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setCsatRating(star)}
                className="p-0.5 transition hover:scale-110"
                title={`Rate ${star} out of 5`}
              >
                <Star
                  className={`h-4 w-4 ${
                    star <= csatRating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={csatFeedback}
            onChange={(e) => setCsatFeedback(e.target.value)}
            placeholder="Record customer satisfaction notes or post-handoff quality feedback..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={submittingCsat}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {submittingCsat ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : csatSuccess ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : null}
            Save CSAT
          </button>
        </div>
      </form>
    </div>
  );
}
