'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Save,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';

export interface EscalationTicket {
  id: string;
  tenantId: string;
  sessionId: string;
  visitorId: string | null;
  reason: string;
  status: 'pending' | 'in_progress' | 'resolved';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function EscalationQueuePanel() {
  const [tickets, setTickets] = useState<EscalationTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadEscalations();
  }, []);

  async function loadEscalations() {
    try {
      setLoading(true);
      const res = await api.get<{ status: string; data: EscalationTicket[] }>('/api/dashboard/escalations');
      const list = res.data || [];
      setTickets(list);
      const initialNotes: Record<string, string> = {};
      list.forEach((t) => {
        initialNotes[t.id] = t.notes || '';
      });
      setNotesDraft(initialNotes);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load escalation queue');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTicket(ticketId: string, status: EscalationTicket['status']) {
    try {
      setSavingId(ticketId);
      const notes = notesDraft[ticketId] ?? '';
      await api.patch(`/api/dashboard/escalations/${ticketId}`, {
        status,
        notes,
      });
      toast.success('Escalation ticket updated!');
      await loadEscalations();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update escalation ticket');
    } finally {
      setSavingId(null);
    }
  }

  const filteredTickets = tickets.filter((t) =>
    statusFilter === 'all' ? true : t.status === statusFilter
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            Human Handoff &amp; Escalation Ticket Queue ({filteredTickets.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatically triggered by Orchestrator on customer complaints or live human agent requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses ({tickets.length})</option>
            <option value="pending">Pending ({tickets.filter((t) => t.status === 'pending').length})</option>
            <option value="in_progress">In Progress ({tickets.filter((t) => t.status === 'in_progress').length})</option>
            <option value="resolved">Resolved ({tickets.filter((t) => t.status === 'resolved').length})</option>
          </select>

          <button
            onClick={loadEscalations}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs text-slate-400">Loading escalation tickets...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-xs text-slate-400">
          No escalation tickets found for this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-[240px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      ticket.reason === 'complaint'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {ticket.reason === 'complaint' ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <UserCheck className="h-3 w-3" />
                    )}
                    {ticket.reason}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      ticket.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ticket.status === 'in_progress'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ticket.status === 'resolved' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-900">
                  Session: <span className="font-mono text-indigo-600">{ticket.sessionId}</span>
                  {ticket.visitorId && (
                    <span className="ml-2 text-slate-500 font-normal">Visitor: {ticket.visitorId}</span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400">
                  Created: {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Add resolution or handoff notes..."
                  value={notesDraft[ticket.id] ?? ''}
                  onChange={(e) => setNotesDraft({ ...notesDraft, [ticket.id]: e.target.value })}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />

                <select
                  value={ticket.status}
                  onChange={(e) =>
                    handleUpdateTicket(ticket.id, e.target.value as EscalationTicket['status'])
                  }
                  disabled={savingId === ticket.id}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="pending">Status: Pending</option>
                  <option value="in_progress">Status: In Progress</option>
                  <option value="resolved">Status: Resolved</option>
                </select>

                <button
                  onClick={() => handleUpdateTicket(ticket.id, ticket.status)}
                  disabled={savingId === ticket.id}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {savingId === ticket.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Note
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
